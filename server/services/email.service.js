const brevoClient = require('../config/brevo');

/**
 * Format month number to month name
 */
const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
};

/**
 * Format date to readable string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Send complaint status update email
 * @param {Object} data - Complaint data
 */
exports.sendComplaintStatusUpdate = async (data) => {
  try {
    const { email, name, flat_no, description, previous_status, new_status, admin_notes, updated_by, updated_at } = data;

    const formattedDate = formatDate(updated_at);
    
    // Status colors and labels
    const statusConfig = {
      'open': { color: '#f59e0b', bg: '#fef3c7', label: 'Open', icon: '📋' },
      'in-progress': { color: '#3b82f6', bg: '#dbeafe', label: 'In Progress', icon: '🔄' },
      'resolved': { color: '#22c55e', bg: '#dcfce7', label: 'Resolved', icon: '✅' }
    };

    const newStatusConfig = statusConfig[new_status] || statusConfig['open'];
    const prevStatusConfig = statusConfig[previous_status] || statusConfig['open'];

    // Truncate description for email
    const shortDescription = description.length > 200 
      ? description.substring(0, 200) + '...' 
      : description;

    const sendSmtpEmail = {
      to: [{ email, name }],
      subject: `Complaint Update: Status changed to ${newStatusConfig.label}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complaint Status Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Nehete Society</h1>
            <p style="color: rgba(255,255,255,0.9); text-align: center; margin: 10px 0 0 0;">Complaint Status Update</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>
            
            <p>Your complaint status has been updated. Here are the details:</p>
            
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Complaint Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666;">Flat No:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; text-align: right;">${flat_no}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666;">Description:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${shortDescription}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666;">Previous Status:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                    <span style="background: ${prevStatusConfig.bg}; color: ${prevStatusConfig.color}; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                      ${prevStatusConfig.icon} ${prevStatusConfig.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666;">New Status:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                    <span style="background: ${newStatusConfig.bg}; color: ${newStatusConfig.color}; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                      ${newStatusConfig.icon} ${newStatusConfig.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666;">Updated By:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; text-align: right;">${updated_by}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666;">Updated On:</td>
                  <td style="padding: 10px 0; text-align: right;">${formattedDate}</td>
                </tr>
              </table>
              
              ${admin_notes ? `
              <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #0d9488; border-radius: 4px;">
                <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; font-weight: bold;">Admin Notes:</p>
                <p style="margin: 8px 0 0 0; color: #333;">${admin_notes}</p>
              </div>
              ` : ''}
            </div>
            
            ${new_status === 'resolved' ? `
            <div style="background: #dcfce7; color: #166534; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px; font-weight: bold;">
                ✅ Your complaint has been resolved!
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">
                Thank you for bringing this to our attention.
              </p>
            </div>
            ` : `
            <div style="background: ${newStatusConfig.bg}; color: ${newStatusConfig.color}; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                ${newStatusConfig.icon} Your complaint is now <strong>${newStatusConfig.label}</strong>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 13px;">
                We will keep you updated on any further progress.
              </p>
            </div>
            `}
            
            <p style="color: #666; font-size: 14px;">
              You can view your complaint details by logging into the society management portal.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated notification from Nehete Society.
            </p>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Complaint Status Update - Nehete Society
        
        Dear ${name},
        
        Your complaint status has been updated.
        
        Complaint Details:
        - Flat No: ${flat_no}
        - Description: ${shortDescription}
        - Previous Status: ${prevStatusConfig.label}
        - New Status: ${newStatusConfig.label}
        - Updated By: ${updated_by}
        - Updated On: ${formattedDate}
        ${admin_notes ? `- Admin Notes: ${admin_notes}` : ''}
        
        ${new_status === 'resolved' 
          ? 'Your complaint has been resolved! Thank you for bringing this to our attention.' 
          : 'We will keep you updated on any further progress.'}
        
        - Nehete Society
      `,
      sender: brevoClient.defaultSender
    };

    const response = await brevoClient.apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Complaint status update email sent:', email);
    return response;
  } catch (error) {
    console.error('Error sending complaint status update email:', error);
    throw error;
  }
};

/**
 * Send password reset OTP email
 * @param {Object} data - OTP data
 */
exports.sendPasswordResetOTP = async (data) => {
  try {
    const { email, name, otp, expiryMinutes } = data;

    const sendSmtpEmail = {
      to: [{ email, name }],
      subject: 'Password Reset OTP - Nehete Society',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🏢 Nehete Society</h1>
            <p style="color: rgba(255,255,255,0.9); text-align: center; margin: 10px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>
            
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            
            <div style="background: #0D9488; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">Your One-Time Password (OTP)</p>
              <h2 style="color: white; font-size: 42px; letter-spacing: 12px; margin: 0; font-family: monospace;">${otp}</h2>
            </div>
            
            <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>⏰ Important:</strong> This OTP will expire in <strong>${expiryMinutes} minutes</strong>.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request a password reset, please ignore this email or contact the society office.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-bottom: 0;">
              This is an automated email from Nehete Society Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Password Reset OTP - Nehete Society
        
        Dear ${name},
        
        We received a request to reset your password. Use the OTP below to proceed:
        
        Your OTP: ${otp}
        
        This OTP will expire in ${expiryMinutes} minutes.
        
        If you didn't request a password reset, please ignore this email.
        
        - Nehete Society
      `,
      sender: brevoClient.defaultSender
    };

    const response = await brevoClient.apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Password reset OTP email sent:', email);
    return response;
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw error;
  }
};

/**
 * Send password reset confirmation email
 * @param {Object} data - User data
 */
exports.sendPasswordResetConfirmation = async (data) => {
  try {
    const { email, name } = data;

    const sendSmtpEmail = {
      to: [{ email, name }],
      subject: 'Password Changed Successfully - Nehete Society',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🏢 Nehete Society</h1>
            <p style="color: rgba(255,255,255,0.9); text-align: center; margin: 10px 0 0 0;">Password Changed</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>
            
            <div style="background: #DCFCE7; border: 1px solid #22C55E; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <span style="color: #22C55E; font-size: 40px;">✓</span>
              <p style="margin: 10px 0 0 0; color: #166534; font-weight: bold; font-size: 18px;">Password Changed Successfully!</p>
            </div>
            
            <p>Your password has been successfully changed. You can now log in with your new password.</p>
            
            <div style="background: #FEE2E2; border: 1px solid #EF4444; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991B1B; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> If you did not make this change, please contact 
                the society office immediately.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-bottom: 0;">
              This is an automated email from Nehete Society Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Password Changed Successfully - Nehete Society
        
        Dear ${name},
        
        Your password has been successfully changed. You can now log in with your new password.
        
        If you did not make this change, please contact the society office immediately.
        
        - Nehete Society
      `,
      sender: brevoClient.defaultSender
    };

    const response = await brevoClient.apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Password reset confirmation email sent:', email);
    return response;
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    throw error;
  }
};

/**
 * Send new notice alert email to all residents
 * @param {Object} data - Notice data
 */
exports.sendNewNoticeAlert = async (data) => {
  try {
    const { email, name, title, content, posted_by } = data;

    const sendSmtpEmail = {
      to: [{ email, name }],
      subject: `📌 IMPORTANT NOTICE: ${title}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Important Notice</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🏢 Nehete Society</h1>
            <p style="color: rgba(255,255,255,0.9); text-align: center; margin: 10px 0 0 0;">New Important Notice Board Announcement</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Dear Resident <strong>${name}</strong>,</p>
            
            <p>A new important notice has been posted on the digital notice board by the management:</p>
            
            <div style="background: white; border-left: 4px solid #2563eb; border-radius: 4px; padding: 20px; margin: 25px 0; border-top: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0;">
              <h3 style="margin-top: 0; color: #1e3a8a; font-size: 18px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">
                📌 ${title}
              </h3>
              <p style="white-space: pre-line; color: #374151;">${content}</p>
              <div style="margin-top: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #f0f0f0; padding-top: 10px;">
                Posted by: <strong>${posted_by}</strong>
              </div>
            </div>
            
            <p>You can view all notices by logging into the society portal.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-bottom: 0;">
              This is an automated email from Nehete Society Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      textContent: `
        New Notice: ${title}
        Nehete Society
        
        Dear Resident ${name},
        
        A new important notice has been posted by ${posted_by}:
        
        --------------------------------------------------
        ${title}
        --------------------------------------------------
        ${content}
        --------------------------------------------------
        
        Please log in to the society portal to view all announcements.
        
        Thank you,
        Nehete Society
      `,
      sender: brevoClient.defaultSender
    };

    const response = await brevoClient.apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Notice board email sent:', email);
    return response;
  } catch (error) {
    console.error('Error sending new notice email:', error);
    throw error;
  }
};