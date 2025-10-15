import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import DoctorApproval from '../models/DoctorApproval.js';
import SystemLog from '../models/SystemLog.js';
import User from '../../user/models/User.js';
import Doctor from '../../doctor/models/Doctor.js';
import Appointment from '../../doctor/models/Appointment.js';
import Prescription from '../../doctor/models/Prescription.js';
import Lab from '../../lab/models/Lab.js';
import LabReport from '../../lab/models/LabReport.js';

export class AdminService {
  static generateToken(adminId) {
    return jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static async authenticateAdmin(email, password) {
    try {
      const admin = await Admin.findOne({ email }).select('+password');
      if (!admin) {
        throw new Error('Invalid email or password');
      }

      if (admin.isLocked()) {
        throw new Error('Account is temporarily locked due to too many failed attempts');
      }

      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        await admin.incLoginAttempts();
        throw new Error('Invalid email or password');
      }

      // Reset login attempts on successful login
      if (admin.loginAttempts > 0) {
        await admin.updateOne({
          $unset: { loginAttempts: 1, lockUntil: 1 }
        });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      return admin;
    } catch (error) {
      throw error;
    }
  }

  static async getDashboardStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalDoctors,
        verifiedDoctors,
        pendingApprovals,
        totalLabs,
        approvedLabs,
        totalLabReports,
        totalAppointments,
        todayAppointments,
        totalRevenue
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Doctor.countDocuments(),
        Doctor.countDocuments({ isVerified: true, isActive: true }),
        DoctorApproval.countDocuments({ status: 'pending' }),
        Lab.countDocuments(),
        Lab.countDocuments({ isApproved: true, isActive: true }),
        LabReport.countDocuments(),
        Appointment.countDocuments(),
        Appointment.countDocuments({
          appointmentDate: {
            $gte: new Date().setHours(0, 0, 0, 0),
            $lt: new Date().setHours(23, 59, 59, 999)
          }
        }),
        this.calculateTotalRevenue()
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          growthRate: await this.calculateUserGrowthRate()
        },
        doctors: {
          total: totalDoctors,
          verified: verifiedDoctors,
          pending: pendingApprovals,
          rejectionRate: await this.calculateDoctorRejectionRate()
        },
        labs: {
          total: totalLabs,
          approved: approvedLabs,
          pending: totalLabs - approvedLabs,
          totalReports: totalLabReports
        },
        labs: {
          total: totalLabs,
          approved: approvedLabs,
          pending: totalLabs - approvedLabs,
          totalReports: totalLabReports
        },
        appointments: {
          total: totalAppointments,
          today: todayAppointments,
          completionRate: await this.calculateAppointmentCompletionRate()
        },
        revenue: {
          total: totalRevenue,
          monthly: await this.calculateMonthlyRevenue(),
          growth: await this.calculateRevenueGrowth()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllUsers(filters = {}) {
    try {
      const query = {};
      
      if (filters.status === 'active') query.isActive = true;
      if (filters.status === 'inactive') query.isActive = false;
      if (filters.verified === 'true') query.isEmailVerified = true;
      if (filters.search) {
        query.$or = [
          { fullName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { healthId: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return users;
    } catch (error) {
      throw error;
    }
  }

  static async updateUserStatus(userId, isActive, adminId, req) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Log admin action
      await SystemLog.createLog({
        level: 'info',
        category: 'user_management',
        action: isActive ? 'user_activated' : 'user_suspended',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'user',
        targetId: userId,
        details: {
          previousStatus: !isActive,
          newStatus: isActive,
          userEmail: user.email
        }
      }, req);

      return user;
    } catch (error) {
      throw error;
    }
  }

  static async getAllDoctors(filters = {}) {
    try {
      const query = {};
      
      if (filters.status === 'verified') query.isVerified = true;
      if (filters.status === 'pending') query.isVerified = false;
      if (filters.active === 'true') query.isActive = true;
      if (filters.specialization) query.specialization = filters.specialization;
      if (filters.search) {
        query.$or = [
          { fullName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { licenseNumber: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const doctors = await Doctor.find(query)
        .select('-password')
        .sort({ createdAt: -1 });

      return doctors;
    } catch (error) {
      throw error;
    }
  }

  static async getPendingDoctorApprovals() {
    try {
      const pendingApprovals = await DoctorApproval.find({ 
        status: { $in: ['pending', 'under_review'] } 
      })
        .populate('doctor', 'fullName email specialization licenseNumber experience')
        .populate('assignedTo', 'fullName email')
        .sort({ priority: -1, submissionDate: 1 });

      return pendingApprovals;
    } catch (error) {
      throw error;
    }
  }

  static async approveDoctorRegistration(doctorId, approved, adminId, comments = '', req) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Update doctor status
      doctor.isVerified = approved;
      doctor.isActive = approved;
      await doctor.save();

      // Update approval record
      await DoctorApproval.findOneAndUpdate(
        { doctor: doctorId },
        {
          status: approved ? 'approved' : 'rejected',
          approvedBy: adminId,
          approvalDate: new Date(),
          reviewComments: comments,
          reviewCompletionDate: new Date()
        }
      );

      // Log admin action
      await SystemLog.createLog({
        level: 'info',
        category: 'doctor_management',
        action: approved ? 'doctor_approved' : 'doctor_rejected',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'doctor',
        targetId: doctorId,
        details: {
          doctorEmail: doctor.email,
          specialization: doctor.specialization,
          licenseNumber: doctor.licenseNumber,
          comments
        }
      }, req);

      return doctor;
    } catch (error) {
      throw error;
    }
  }

  static async updateDoctorStatus(doctorId, isActive, adminId, req) {
    try {
      const doctor = await Doctor.findByIdAndUpdate(
        doctorId,
        { isActive },
        { new: true }
      );

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Log admin action
      await SystemLog.createLog({
        level: 'info',
        category: 'doctor_management',
        action: isActive ? 'doctor_activated' : 'doctor_suspended',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'doctor',
        targetId: doctorId,
        details: {
          previousStatus: !isActive,
          newStatus: isActive,
          doctorEmail: doctor.email,
          specialization: doctor.specialization
        }
      }, req);

      return doctor;
    } catch (error) {
      throw error;
    }
  }

  static async getSystemLogs(filters = {}) {
    try {
      const query = {};
      
      if (filters.level) query.level = filters.level;
      if (filters.category) query.category = filters.category;
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      const logs = await SystemLog.find(query)
        .populate('performedBy.userId', 'fullName email')
        .populate('resolvedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return logs;
    } catch (error) {
      throw error;
    }
  }

  static async getSystemNotifications(adminId) {
    try {
      // Get recent system logs that require attention
      const criticalLogs = await SystemLog.find({
        level: { $in: ['warning', 'error', 'critical'] },
        resolved: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).sort({ createdAt: -1 });

      // Get pending doctor approvals
      const pendingApprovals = await DoctorApproval.countDocuments({ 
        status: 'pending' 
      });

      // Get system health metrics
      const systemHealth = await this.getSystemHealthMetrics();

      return {
        criticalAlerts: criticalLogs,
        pendingApprovals,
        systemHealth,
        unreadCount: criticalLogs.length + (pendingApprovals > 0 ? 1 : 0)
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAnalytics(period = 'month') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const [userGrowth, doctorGrowth, appointmentTrends, revenueTrends] = await Promise.all([
        this.getUserGrowthAnalytics(startDate),
        this.getDoctorGrowthAnalytics(startDate),
        this.getAppointmentTrends(startDate),
        this.getRevenueTrends(startDate)
      ]);

      return {
        userGrowth,
        doctorGrowth,
        appointmentTrends,
        revenueTrends,
        period,
        generatedAt: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for calculations
  static async calculateUserGrowthRate() {
    const thisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });
    const lastMonth = await User.countDocuments({
      createdAt: { 
        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });
    
    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;
  }

  static async calculateDoctorRejectionRate() {
    const totalReviewed = await DoctorApproval.countDocuments({ 
      status: { $in: ['approved', 'rejected'] } 
    });
    const rejected = await DoctorApproval.countDocuments({ status: 'rejected' });
    
    return totalReviewed > 0 ? ((rejected / totalReviewed) * 100).toFixed(1) : 0;
  }

  static async calculateAppointmentCompletionRate() {
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    
    return totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : 0;
  }

  static async calculateTotalRevenue() {
    const result = await Appointment.aggregate([
      { $match: { status: 'completed', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$consultationFee' } } }
    ]);
    
    return result[0]?.total || 0;
  }

  static async calculateMonthlyRevenue() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const result = await Appointment.aggregate([
      { 
        $match: { 
          status: 'completed', 
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$consultationFee' } } }
    ]);
    
    return result[0]?.total || 0;
  }

  static async calculateRevenueGrowth() {
    const thisMonth = await this.calculateMonthlyRevenue();
    
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const lastMonthResult = await Appointment.aggregate([
      { 
        $match: { 
          status: 'completed', 
          paymentStatus: 'paid',
          createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
        } 
      },
      { $group: { _id: null, total: { $sum: '$consultationFee' } } }
    ]);
    
    const lastMonth = lastMonthResult[0]?.total || 0;
    
    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;
  }

  static async getUserGrowthAnalytics(startDate) {
    const result = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return result;
  }

  static async getDoctorGrowthAnalytics(startDate) {
    const result = await Doctor.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return result;
  }

  static async getAppointmentTrends(startDate) {
    const result = await Appointment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$appointmentDate' },
            month: { $month: '$appointmentDate' },
            day: { $dayOfMonth: '$appointmentDate' }
          },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return result;
  }

  static async getRevenueTrends(startDate) {
    const result = await Appointment.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: 'completed',
          paymentStatus: 'paid'
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$consultationFee' },
          appointments: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return result;
  }

  static async getSystemHealthMetrics() {
    try {
      const [
        errorCount,
        warningCount,
        activeUsers,
        systemUptime
      ] = await Promise.all([
        SystemLog.countDocuments({ 
          level: 'error', 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        SystemLog.countDocuments({ 
          level: 'warning', 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        User.countDocuments({ 
          lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        this.calculateSystemUptime()
      ]);

      return {
        status: errorCount === 0 ? 'healthy' : errorCount < 5 ? 'warning' : 'critical',
        errorCount,
        warningCount,
        activeUsers,
        uptime: systemUptime
      };
    } catch (error) {
      throw error;
    }
  }

  static async calculateSystemUptime() {
    // In production, this would check actual system metrics
    // For now, return a mock uptime percentage
    return 99.9;
  }

  static async createSystemBackup(adminId, req) {
    try {
      // Log backup initiation
      await SystemLog.createLog({
        level: 'info',
        category: 'system',
        action: 'backup_initiated',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'system',
        targetId: adminId,
        details: {
          backupType: 'manual',
          initiatedBy: adminId
        }
      }, req);

      // In production, this would trigger actual backup process
      console.log('System backup initiated by admin:', adminId);
      
      return {
        backupId: `backup_${Date.now()}`,
        status: 'initiated',
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error) {
      throw error;
    }
  }

  static async exportReport(reportType, filters = {}) {
    try {
      let data;
      
      switch (reportType) {
        case 'users':
          data = await this.generateUserReport(filters);
          break;
        case 'doctors':
          data = await this.generateDoctorReport(filters);
          break;
        case 'appointments':
          data = await this.generateAppointmentReport(filters);
          break;
        case 'financial':
          data = await this.generateFinancialReport(filters);
          break;
        default:
          throw new Error('Invalid report type');
      }

      return {
        reportType,
        generatedAt: new Date(),
        data,
        recordCount: data.length
      };
    } catch (error) {
      throw error;
    }
  }

  static async generateUserReport(filters) {
    return await User.find(filters)
      .select('fullName email age gender phone address.city address.state createdAt lastLogin isActive')
      .sort({ createdAt: -1 });
  }

  static async generateDoctorReport(filters) {
    return await Doctor.find(filters)
      .select('fullName email specialization experience consultationFee totalPatients totalEarnings rating isVerified createdAt')
      .sort({ createdAt: -1 });
  }

  static async generateAppointmentReport(filters) {
    return await Appointment.find(filters)
      .populate('doctor', 'fullName specialization')
      .populate('patient', 'fullName email')
      .select('appointmentDate timeSlot status type consultationFee paymentStatus createdAt')
      .sort({ appointmentDate: -1 });
  }

  static async generateFinancialReport(filters) {
    return await Appointment.aggregate([
      { $match: { status: 'completed', paymentStatus: 'paid', ...filters } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$consultationFee' },
          appointmentCount: { $sum: 1 },
          averageFee: { $avg: '$consultationFee' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
  }
}