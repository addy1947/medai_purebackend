import SystemLog from '../models/SystemLog.js';
import DoctorApproval from '../models/DoctorApproval.js';
import User from '../../user/models/User.js';
import Doctor from '../../doctor/models/Doctor.js';

export class NotificationService {
  static async createSystemNotification(type, title, message, priority = 'medium', targetAdmins = []) {
    try {
      const notification = {
        type,
        title,
        message,
        priority,
        targetAdmins,
        createdAt: new Date(),
        read: false
      };

      // Log as system notification
      await SystemLog.createLog({
        level: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
        category: 'system',
        action: 'notification_created',
        performedBy: {
          userType: 'system'
        },
        targetEntity: 'system',
        targetId: null,
        details: notification
      });

      return notification;
    } catch (error) {
      throw error;
    }
  }

  static async notifyDoctorRegistration(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) return;

      await this.createSystemNotification(
        'info',
        'New Doctor Registration',
        `Dr. ${doctor.fullName} (${doctor.specialization}) has registered and requires verification.`,
        'high',
        ['medical_admin']
      );
    } catch (error) {
      console.error('Error sending doctor registration notification:', error);
    }
  }

  static async notifyHighRiskPatient(patientId, riskDetails) {
    try {
      const patient = await User.findById(patientId);
      if (!patient) return;

      await this.createSystemNotification(
        'warning',
        'High-Risk Patient Alert',
        `Patient ${patient.fullName} has been flagged for high-risk symptoms: ${riskDetails.symptoms.join(', ')}`,
        'urgent',
        ['medical_admin', 'operations_admin']
      );
    } catch (error) {
      console.error('Error sending high-risk patient notification:', error);
    }
  }

  static async notifySystemError(error, context = {}) {
    try {
      await this.createSystemNotification(
        'error',
        'System Error Detected',
        `System error occurred: ${error.message}. Context: ${JSON.stringify(context)}`,
        'high',
        ['technical_admin']
      );
    } catch (notificationError) {
      console.error('Error sending system error notification:', notificationError);
    }
  }

  static async notifySecurityAlert(alertType, details) {
    try {
      await this.createSystemNotification(
        'warning',
        `Security Alert: ${alertType}`,
        `Security incident detected: ${details.description}`,
        'urgent',
        ['security_admin', 'super_admin']
      );
    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  static async getAdminNotifications(adminId, filters = {}) {
    try {
      const query = {
        level: { $in: ['warning', 'error', 'critical'] },
        category: { $in: ['security', 'doctor_management', 'user_management', 'system'] }
      };

      if (filters.unreadOnly) {
        query.resolved = false;
      }

      if (filters.level) {
        query.level = filters.level;
      }

      if (filters.category) {
        query.category = filters.category;
      }

      const notifications = await SystemLog.find(query)
        .sort({ createdAt: -1 })
        .limit(50);

      // Transform to notification format
      const formattedNotifications = notifications.map(log => ({
        id: log._id,
        type: log.level,
        title: this.generateNotificationTitle(log.action, log.category),
        message: this.generateNotificationMessage(log),
        timestamp: log.createdAt,
        read: log.resolved,
        priority: this.mapLevelToPriority(log.level),
        category: log.category,
        details: log.details
      }));

      return formattedNotifications;
    } catch (error) {
      throw error;
    }
  }

  static generateNotificationTitle(action, category) {
    const titleMap = {
      'doctor_approved': 'Doctor Approved',
      'doctor_rejected': 'Doctor Registration Rejected',
      'user_suspended': 'User Account Suspended',
      'user_activated': 'User Account Activated',
      'system_error': 'System Error',
      'security_alert': 'Security Alert',
      'backup_completed': 'Backup Completed',
      'payment_failed': 'Payment Processing Failed'
    };

    return titleMap[action] || `${category.replace('_', ' ')} Action`;
  }

  static generateNotificationMessage(log) {
    const { action, details, targetEntity } = log;
    
    switch (action) {
      case 'doctor_approved':
        return `Dr. ${details.doctorEmail} has been approved for ${details.specialization}`;
      case 'user_suspended':
        return `User account ${details.userEmail} has been suspended`;
      case 'unauthorized_access_attempt':
        return `Unauthorized access attempt to ${details.endpoint} by ${details.userEmail || 'unknown user'}`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded for ${details.endpoint} - ${details.attemptCount} attempts`;
      default:
        return `${action.replace('_', ' ')} performed on ${targetEntity}`;
    }
  }

  static mapLevelToPriority(level) {
    const priorityMap = {
      'critical': 'urgent',
      'error': 'high',
      'warning': 'medium',
      'info': 'low'
    };
    
    return priorityMap[level] || 'medium';
  }

  static async markNotificationAsRead(notificationId, adminId) {
    try {
      await SystemLog.findByIdAndUpdate(notificationId, {
        resolved: true,
        resolvedBy: adminId,
        resolvedDate: new Date()
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getNotificationStats(adminId) {
    try {
      const [
        totalUnread,
        criticalCount,
        warningCount,
        todayCount
      ] = await Promise.all([
        SystemLog.countDocuments({ 
          resolved: false, 
          level: { $in: ['warning', 'error', 'critical'] } 
        }),
        SystemLog.countDocuments({ 
          resolved: false, 
          level: 'critical' 
        }),
        SystemLog.countDocuments({ 
          resolved: false, 
          level: 'warning' 
        }),
        SystemLog.countDocuments({
          createdAt: { 
            $gte: new Date().setHours(0, 0, 0, 0) 
          },
          level: { $in: ['warning', 'error', 'critical'] }
        })
      ]);

      return {
        totalUnread,
        criticalCount,
        warningCount,
        todayCount
      };
    } catch (error) {
      throw error;
    }
  }
}