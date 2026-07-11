const Setting = require('../models/Setting');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin/Manager only)
exports.getSettings = async (req, res, next) => {
  try {
    const settingsList = await Setting.find();
    
    // Convert array to key-value object
    const settings = {
      overdue_threshold_days: 3 // default
    };
    
    settingsList.forEach(s => {
      settings[s.key] = s.value;
    });

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a setting
// @route   PUT /api/settings
// @access  Private (Admin/Manager only)
exports.updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required'
      });
    }

    let setting = await Setting.findOne({ key });
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = await Setting.create({ key, value });
    }

    res.status(200).json({
      success: true,
      message: `Setting '${key}' updated successfully`,
      data: setting
    });
  } catch (error) {
    next(error);
  }
};
