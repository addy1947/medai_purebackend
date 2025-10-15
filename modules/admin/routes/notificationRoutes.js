import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  getNotificationStats,
  createSystemAlert
} from '../controllers/notificationController.js';
import { requirePermission } from '../middlewares/adminAuth.js';

const router = express.Router();

// Notification routes
router.get('/', getNotifications);
router.put('/:notificationId/read', markNotificationAsRead);
router.get('/stats', getNotificationStats);
router.post('/alerts', requirePermission('system_settings'), createSystemAlert);

export default router;