const Notice = require('../models/Notice');
const User = require('../models/User');
const emailService = require('../services/email.service');

// @desc    Get all notices
// @route   GET /api/notices
// @access  Private
exports.getNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find()
      .populate('created_by', 'name email role')
      .sort({ is_important: -1, created_at: -1 });

    res.status(200).json({
      success: true,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new notice
// @route   POST /api/notices
// @access  Private (Admin/Manager only)
exports.createNotice = async (req, res, next) => {
  try {
    const { title, content, is_important } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const notice = await Notice.create({
      title,
      content,
      is_important: !!is_important,
      created_by: req.user._id
    });

    await notice.populate('created_by', 'name email role');

    // Send emails to residents if notice is marked important
    if (is_important) {
      try {
        const residents = await User.find({ role: 'resident' });
        
        // Send emails asynchronously
        residents.forEach((resident) => {
          emailService.sendNewNoticeAlert({
            email: resident.email,
            name: resident.name,
            title,
            content,
            posted_by: req.user.name
          }).catch(err => {
            console.error(`Failed to send notice email to ${resident.email}:`, err.message);
          });
        });
      } catch (err) {
        console.error('Error fetching residents for notice emails:', err);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notice posted successfully',
      data: notice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin/Manager only)
exports.deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    await Notice.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
