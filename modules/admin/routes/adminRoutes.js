import express from 'express';
import {
  loginAdmin,
  logoutAdmin,
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getUserHealthVault,
  getAllDoctors,
  getPendingDoctorApprovals,
  approveDoctorRegistration,
  updateDoctorStatus,
  getAllLabs,
  getPendingLabApprovals,
  approveLabRegistration,
  updateLabStatus,
  getSystemLogs,
  getSystemNotifications,
  getAnalytics,
  exportReport,
  createSystemBackup,
  getSystemSettings,
  updateSystemSettings,
  getAllAppointments,
  getAppointmentAnalytics
} from '../controllers/adminController.js';
import medicineRoutes from './medicineRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import { authenticate, authorize } from '../../../middlewares/authMiddleware.js';
import { validateAdminLogin } from '../../../middlewares/validation.js';

const router = express.Router();

// Authentication routes
router.post('/login', validateAdminLogin, loginAdmin);
router.post('/logout', logoutAdmin);

// Protected routes (require admin authentication)
router.use(authenticate);
router.use(authorize('admin', 'super-admin', 'moderator'));

// Dashboard and analytics
router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics', getAnalytics);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId/status', updateUserStatus);
router.get('/users/:userId/health-vault', getUserHealthVault);

// Doctor management
router.get('/doctors', getAllDoctors);
router.get('/doctors/pending', getPendingDoctorApprovals);
router.put('/doctors/:doctorId/approve', approveDoctorRegistration);
router.put('/doctors/:doctorId/status', updateDoctorStatus);

// Lab management
router.get('/labs', getAllLabs);
router.get('/labs/pending', getPendingLabApprovals);
router.put('/labs/:labId/approve', approveLabRegistration);
router.put('/labs/:labId/status', updateLabStatus);

// Appointment management
router.get('/appointments', getAllAppointments);
router.get('/appointments/analytics', getAppointmentAnalytics);

// Medicine management
router.use('/medicines', medicineRoutes);

// Notification management
router.use('/notifications', notificationRoutes);

// System management
router.get('/system/logs', getSystemLogs);
router.get('/system/notifications', getSystemNotifications);
router.post('/system/backup', createSystemBackup);

// Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Reports
router.get('/reports/export/:reportType', exportReport);

export default router;