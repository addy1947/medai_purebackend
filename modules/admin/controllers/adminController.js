import { AdminService } from '../services/adminService.js';
import { asyncHandler } from '../../../middlewares/errorHandler.js';
import { sendResponse, sendError } from '../../../utils/responseHelper.js';
import Lab from '../../lab/models/Lab.js';
import SystemLog from '../models/SystemLog.js';

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const admin = await AdminService.authenticateAdmin(email, password);
  const token = AdminService.generateToken(admin._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  sendResponse(res, 200, true, 'Admin login successful', { admin, token });
});

export const logoutAdmin = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  sendResponse(res, 200, true, 'Admin logout successful');
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await AdminService.getDashboardStats();
  sendResponse(res, 200, true, 'Dashboard stats retrieved successfully', { stats });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    verified: req.query.verified,
    search: req.query.search,
    limit: parseInt(req.query.limit) || 100
  };
  
  const users = await AdminService.getAllUsers(filters);
  sendResponse(res, 200, true, 'Users retrieved successfully', { users });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  
  const user = await AdminService.updateUserStatus(userId, isActive, req.user._id, req);
  sendResponse(res, 200, true, `User ${isActive ? 'activated' : 'suspended'} successfully`, { user });
});

export const getUserHealthVault = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check admin permissions
  if (!req.user.permissions.includes('view_health_vaults')) {
    return sendError(res, 403, 'Insufficient permissions to access health vaults');
  }
  
  const user = await User.findById(userId);
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  const healthVault = {
    medicalHistory: user.medicalHistory,
    prescriptions: user.prescriptions,
    labReports: user.labReports,
    insurance: user.insurance
  };

  // Log access for audit
  await SystemLog.createLog({
    level: 'info',
    category: 'user_management',
    action: 'health_vault_accessed',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'user',
    targetId: userId,
    details: {
      patientEmail: user.email,
      accessReason: 'admin_review'
    }
  }, req);

  sendResponse(res, 200, true, 'Health vault retrieved successfully', { healthVault });
});

export const getAllDoctors = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    active: req.query.active,
    specialization: req.query.specialization,
    search: req.query.search
  };
  
  const doctors = await AdminService.getAllDoctors(filters);
  sendResponse(res, 200, true, 'Doctors retrieved successfully', { doctors });
});

export const getPendingDoctorApprovals = asyncHandler(async (req, res) => {
  const pendingApprovals = await AdminService.getPendingDoctorApprovals();
  sendResponse(res, 200, true, 'Pending approvals retrieved successfully', { pendingApprovals });
});

export const approveDoctorRegistration = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { approved, comments } = req.body;
  
  const doctor = await AdminService.approveDoctorRegistration(
    doctorId, 
    approved, 
    req.user._id, 
    comments, 
    req
  );
  
  sendResponse(res, 200, true, `Doctor registration ${approved ? 'approved' : 'rejected'} successfully`, { doctor });
});

export const updateDoctorStatus = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { isActive } = req.body;
  
  const doctor = await AdminService.updateDoctorStatus(doctorId, isActive, req.user._id, req);
  sendResponse(res, 200, true, `Doctor ${isActive ? 'activated' : 'suspended'} successfully`, { doctor });
});

export const getSystemLogs = asyncHandler(async (req, res) => {
  const filters = {
    level: req.query.level,
    category: req.query.category,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    limit: parseInt(req.query.limit) || 100
  };
  
  const logs = await AdminService.getSystemLogs(filters);
  sendResponse(res, 200, true, 'System logs retrieved successfully', { logs });
});

export const getSystemNotifications = asyncHandler(async (req, res) => {
  const notifications = await AdminService.getSystemNotifications(req.user._id);
  sendResponse(res, 200, true, 'Notifications retrieved successfully', { notifications });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const analytics = await AdminService.getAnalytics(period);
  sendResponse(res, 200, true, 'Analytics retrieved successfully', { analytics });
});

export const exportReport = asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const filters = req.query;
  
  const report = await AdminService.exportReport(reportType, filters);
  
  // Log report generation
  await SystemLog.createLog({
    level: 'info',
    category: 'system',
    action: 'report_exported',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'system',
    targetId: req.user._id,
    details: {
      reportType,
      filters,
      recordCount: report.recordCount
    }
  }, req);

  sendResponse(res, 200, true, 'Report generated successfully', { report });
});

export const createSystemBackup = asyncHandler(async (req, res) => {
  const backup = await AdminService.createSystemBackup(req.user._id, req);
  sendResponse(res, 200, true, 'System backup initiated successfully', { backup });
});

export const getSystemSettings = asyncHandler(async (req, res) => {
  // Mock system settings - in production, this would come from a settings collection
  const settings = {
    general: {
      platformName: 'MedAI Healthcare Platform',
      supportEmail: 'support@medai.com',
      maintenanceMode: false,
      registrationEnabled: true
    },
    ai: {
      confidenceThreshold: 85,
      enableAutoApproval: false,
      maxDailyAnalyses: 1000
    },
    payments: {
      platformFeePercentage: 10,
      minimumPayout: 1000,
      payoutFrequency: 'weekly'
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      requireTwoFactor: false
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true
    }
  };

  sendResponse(res, 200, true, 'System settings retrieved successfully', { settings });
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const settings = req.body;
  
  // Log settings update
  await SystemLog.createLog({
    level: 'info',
    category: 'system',
    action: 'settings_updated',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'system',
    targetId: req.user._id,
    details: {
      updatedSettings: settings
    }
  }, req);

  sendResponse(res, 200, true, 'System settings updated successfully', { settings });
});

export const getAllAppointments = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.startDate && filters.endDate) {
    query.appointmentDate = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  const appointments = await Appointment.find(query)
    .populate('doctor', 'fullName specialization')
    .populate('patient', 'fullName email')
    .sort({ appointmentDate: -1 })
    .limit(100);

  sendResponse(res, 200, true, 'Appointments retrieved successfully', { appointments });
});

export const getAppointmentAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  
  const analytics = await AdminService.getAppointmentTrends(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  );

  sendResponse(res, 200, true, 'Appointment analytics retrieved successfully', { analytics });
});

// Lab management controllers
export const getAllLabs = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    active: req.query.active,
    service: req.query.service,
    search: req.query.search
  };

  const query = { isApproved: true };
  if (filters.active === 'true') query.isActive = true;
  if (filters.active === 'false') query.isActive = false;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { licenseNumber: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const labs = await Lab.find(query)
    .select('-password')
    .sort({ createdAt: -1 });

  sendResponse(res, 200, true, 'Labs retrieved successfully', { labs });
});

export const getPendingLabApprovals = asyncHandler(async (req, res) => {
  const pendingLabs = await Lab.find({ isApproved: false })
    .select('-password')
    .sort({ createdAt: 1 });

  sendResponse(res, 200, true, 'Pending lab approvals retrieved successfully', { labs: pendingLabs });
});

export const approveLabRegistration = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { approved, comments } = req.body;
  
  const lab = await Lab.findByIdAndUpdate(
    labId,
    { 
      isApproved: approved,
      isActive: approved,
      approvedBy: req.user._id,
      approvalDate: approved ? new Date() : undefined,
      rejectionReason: approved ? undefined : comments
    },
    { new: true }
  );

  if (!lab) {
    return sendError(res, 404, 'Lab not found');
  }

  // Log admin action
  await SystemLog.createLog({
    level: 'info',
    category: 'lab_management',
    action: approved ? 'lab_approved' : 'lab_rejected',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'lab',
    targetId: labId,
    details: {
      labName: lab.name,
      licenseNumber: lab.licenseNumber,
      comments
    }
  }, req);

  sendResponse(res, 200, true, `Lab registration ${approved ? 'approved' : 'rejected'} successfully`, { lab });
});

export const updateLabStatus = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { isActive } = req.body;
  
  const lab = await Lab.findByIdAndUpdate(
    labId,
    { isActive },
    { new: true }
  );

  if (!lab) {
    return sendError(res, 404, 'Lab not found');
  }

  // Log admin action
  await SystemLog.createLog({
    level: 'info',
    category: 'lab_management',
    action: isActive ? 'lab_activated' : 'lab_suspended',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'lab',
    targetId: labId,
    details: {
      previousStatus: !isActive,
      newStatus: isActive,
      labName: lab.name
    }
  }, req);

  sendResponse(res, 200, true, `Lab ${isActive ? 'activated' : 'suspended'} successfully`, { lab });
});