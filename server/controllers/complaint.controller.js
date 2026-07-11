const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { sendComplaintStatusUpdate } = require('../services/email.service');
const { getAuthenticationParameters } = require('../services/upload.service');

/**
 * @desc    Create a new complaint
 * @route   POST /api/complaints
 * @access  Private (All authenticated users)
 */
exports.createComplaint = async (req, res, next) => {
  try {
    const { description, image_url, category } = req.body;
    const user = req.user;

    // Validate description
    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Complaint description is required'
      });
    }

    if (description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 1000 characters'
      });
    }

    // Validate category
    const validCategories = ['Plumbing', 'Electrical', 'Lift/Elevator', 'Security/Parking', 'Cleaning/Garbage', 'Others'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
    }

    // Create complaint
    const complaint = await Complaint.create({
      user_id: user._id,
      flat_no: user.flat_no,
      category,
      description: description.trim(),
      image_url: image_url || null,
      status: 'open',
      priority: 'medium',
      status_history: [{
        status: 'open',
        actor: user._id,
        note: 'Complaint filed',
        timestamp: new Date()
      }]
    });

    // Populate user info for response
    await complaint.populate('user_id', 'name email flat_no phone');
    await complaint.populate('status_history.actor', 'name role');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    next(error);
  }
};

/**
 * @desc    Get current user's complaints
 * @route   GET /api/complaints
 * @access  Private (All authenticated users)
 */
exports.getUserComplaints = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { user_id: user._id };
    if (status && ['open', 'in-progress', 'resolved'].includes(status)) {
      query.status = status;
    }

    // Count total
    const total = await Complaint.countDocuments(query);

    // Get complaints with pagination
    const complaints = await Complaint.find(query)
      .populate('user_id', 'name email flat_no')
      .populate('resolved_by', 'name email')
      .populate('status_history.actor', 'name role')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: complaints,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user complaints:', error);
    next(error);
  }
};

/**
 * @desc    Get all complaints (Admin/Manager only)
 * @route   GET /api/complaints/all
 * @access  Private (Manager, Admin)
 */
exports.getAllComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, category, date, flat_no } = req.query;

    // Build query
    const query = {};
    if (status && ['open', 'in-progress', 'resolved'].includes(status)) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }
    if (flat_no) {
      query.flat_no = flat_no;
    }
    if (date) {
      const dateVal = new Date(date);
      if (!isNaN(dateVal.getTime())) {
        const startOfDay = new Date(dateVal.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateVal.setHours(23, 59, 59, 999));
        query.created_at = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    // Get threshold settings for overdue checking
    const thresholdDaysSetting = await Setting.findOne({ key: 'overdue_threshold_days' });
    const thresholdDays = thresholdDaysSetting ? parseInt(thresholdDaysSetting.value) : 3;
    const limitDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    // Count total
    const total = await Complaint.countDocuments(query);

    // Get complaints with aggregation to sort overdue first, then newest first
    const complaints = await Complaint.aggregate([
      { $match: query },
      {
        $addFields: {
          is_overdue: {
            $and: [
              { $ne: ['$status', 'resolved'] },
              { $lt: ['$created_at', limitDate] }
            ]
          }
        }
      },
      {
        $sort: {
          is_overdue: -1, // True first
          created_at: -1  // Newest first
        }
      },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    ]);

    // Populate references in aggregation output
    await Complaint.populate(complaints, [
      { path: 'user_id', select: 'name email flat_no phone' },
      { path: 'resolved_by', select: 'name email' },
      { path: 'status_history.actor', select: 'name role' }
    ]);

    // Get global dashboard metrics
    const statsData = await Complaint.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          overdueCount: [
            {
              $match: {
                status: { $ne: 'resolved' },
                created_at: { $lt: limitDate }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const statsMap = {
      open: 0,
      'in-progress': 0,
      resolved: 0,
      categories: {},
      overdue: 0
    };

    if (statsData && statsData[0]) {
      const facet = statsData[0];
      facet.byStatus.forEach(s => {
        statsMap[s._id] = s.count;
      });
      facet.byCategory.forEach(c => {
        statsMap.categories[c._id] = c.count;
      });
      if (facet.overdueCount && facet.overdueCount[0]) {
        statsMap.overdue = facet.overdueCount[0].count;
      }
    }

    res.status(200).json({
      success: true,
      data: complaints,
      stats: statsMap,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all complaints:', error);
    next(error);
  }
};

/**
 * @desc    Get complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private (Owner or Manager/Admin)
 */
exports.getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const complaint = await Complaint.findById(id)
      .populate('user_id', 'name email flat_no phone')
      .populate('resolved_by', 'name email')
      .populate('status_history.actor', 'name role');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user is owner or admin/manager
    const isOwner = complaint.user_id._id.toString() === user._id.toString();
    const isAdmin = ['manager', 'admin'].includes(user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint'
      });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    next(error);
  }
};

/**
 * @desc    Update complaint status (Admin/Manager only)
 * @route   PUT /api/complaints/:id/status
 * @access  Private (Manager, Admin)
 */
exports.updateComplaintStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const user = req.user;

    // Validate status
    const validStatuses = ['open', 'in-progress', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: open, in-progress, or resolved'
      });
    }

    // Find complaint
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const previousStatus = complaint.status;

    // Update complaint
    complaint.status = status;
    if (admin_notes) {
      complaint.admin_notes = admin_notes;
    }
    if (status === 'resolved') {
      complaint.resolved_by = user._id;
    }

    // Add status history entry
    complaint.status_history.push({
      status,
      actor: user._id,
      note: admin_notes || `Status changed from ${previousStatus} to ${status}`,
      timestamp: new Date()
    });

    await complaint.save();

    // Populate for response
    await complaint.populate('user_id', 'name email flat_no phone');
    await complaint.populate('resolved_by', 'name email');
    await complaint.populate('status_history.actor', 'name role');

    // Send email notification to complaint owner if status changed
    if (previousStatus !== status) {
      try {
        await sendComplaintStatusUpdate({
          email: complaint.user_id.email,
          name: complaint.user_id.name,
          flat_no: complaint.flat_no,
          description: complaint.description,
          previous_status: previousStatus,
          new_status: status,
          admin_notes: admin_notes || null,
          updated_by: user.name,
          updated_at: new Date()
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError.message);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}`,
      data: complaint
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    next(error);
  }
};

/**
 * @desc    Update complaint priority (Admin/Manager only)
 * @route   PUT /api/complaints/:id/priority
 * @access  Private (Manager, Admin)
 */
exports.updateComplaintPriority = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Must be: low, medium, or high'
      });
    }

    // Find complaint
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Update complaint priority
    complaint.priority = priority;
    await complaint.save();

    // Populate for response
    await complaint.populate('user_id', 'name email flat_no phone');
    await complaint.populate('resolved_by', 'name email');
    await complaint.populate('status_history.actor', 'name role');

    res.status(200).json({
      success: true,
      message: `Complaint priority updated to ${priority}`,
      data: complaint
    });
  } catch (error) {
    console.error('Error updating complaint priority:', error);
    next(error);
  }
};

/**
 * @desc    Get ImageKit upload URL/authentication
 * @route   POST /api/complaints/upload-url
 * @access  Private (All authenticated users)
 */
exports.getUploadUrl = async (req, res, next) => {
  try {
    const result = getAuthenticationParameters();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate upload credentials'
      });
    }

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    next(error);
  }
};
