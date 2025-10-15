import { NotificationService } from '../services/notificationService.js';
import { asyncHandler } from '../../../middlewares/errorHandler.js';
import { sendResponse } from '../../../utils/responseHelper.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const filters = {
    unreadOnly: req.query.unread === 'true',
    level: req.query.level,
    category: req.query.category
  };

  const notifications = await NotificationService.getAdminNotifications(req.user._id, filters);
  sendResponse(res, 200, true, 'Notifications retrieved successfully', { notifications });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  
  await NotificationService.markNotificationAsRead(notificationId, req.user._id);
  sendResponse(res, 200, true, 'Notification marked as read');
});

export const getNotificationStats = asyncHandler(async (req, res) => {
  const stats = await NotificationService.getNotificationStats(req.user._id);
  sendResponse(res, 200, true, 'Notification stats retrieved successfully', { stats });
});

export const createSystemAlert = asyncHandler(async (req, res) => {
  const { type, title, message, priority } = req.body;
  
  const notification = await NotificationService.createSystemNotification(
    type, 
    title, 
    message, 
    priority
  );
  
  sendResponse(res, 201, true, 'System alert created successfully', { notification });
});