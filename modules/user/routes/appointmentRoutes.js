import express from 'express';
import {
  bookAppointment,
  getUserAppointments,
  cancelAppointment,
  getAvailableTimeSlots,
  getAvailableDoctors
} from '../controllers/appointmentController.js';
import { authenticate } from '../../../middlewares/authMiddleware.js';
import { validateAppointmentBooking } from '../../../middlewares/validation.js';

const router = express.Router();

// Public routes
router.get('/doctors/available', getAvailableDoctors);

// Protected routes
router.use(authenticate);

router.post('/book', validateAppointmentBooking, bookAppointment);
router.get('/my-appointments', getUserAppointments);
router.put('/:appointmentId/cancel', cancelAppointment);
router.get('/doctors/:doctorId/slots', getAvailableTimeSlots);

export default router;