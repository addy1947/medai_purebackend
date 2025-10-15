import { AppointmentService } from '../services/appointmentService.js';
import { DoctorService } from '../../doctor/services/doctorService.js';
import { asyncHandler } from '../../../middlewares/errorHandler.js';

export const bookAppointment = asyncHandler(async (req, res) => {

  const appointmentData = {
    ...req.body,
    patient: req.user._id
  };

  
  const appointment = await AppointmentService.createAppointment(appointmentData);
 
  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: { appointment }
  });
});

export const getUserAppointments = asyncHandler(async (req, res) => {
  const appointments = await AppointmentService.getUserAppointments(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { appointments }
  });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { cancelReason } = req.body;
  
  const appointment = await AppointmentService.cancelAppointment(appointmentId, cancelReason);
  
  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: { appointment }
  });
});

export const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;
  
  const timeSlots = await AppointmentService.getAvailableTimeSlots(doctorId, date);
 
  res.status(200).json({
    success: true,
    data: { timeSlots }
  });
});

export const getAvailableDoctors = asyncHandler(async (req, res) => {
  const { specialization } = req.query;
  const doctors = await DoctorService.getAvailableDoctors(specialization);
  
  res.status(200).json({
    success: true,
    data: { doctors }
  });
});