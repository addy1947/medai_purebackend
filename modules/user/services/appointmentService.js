import Appointment from '../../doctor/models/Appointment.js';
import Doctor from '../../doctor/models/Doctor.js';
import User from '../models/User.js';

export class AppointmentService {
  static async createAppointment(appointmentData) {
    
    try {
   
      const appointment =  await Appointment.create(appointmentData);
      await appointment.save();
      
      return appointment;
    } catch (error) {
     
      throw error;
    }
  }

  static async getUserAppointments(userId) {
    try {
      const appointments = await Appointment.find({ patient: userId })
        .populate('doctor', 'fullName specialization consultationFee rating clinicDetails')
        .sort({ appointmentDate: -1 });
      
      return appointments;
    } catch (error) {
   
      throw error;
    }
  }

  static async cancelAppointment(appointmentId, cancelReason) {
    try {
      const appointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          status: 'cancelled',
          cancelReason 
        },
        { new: true }
      );
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      return appointment;
    } catch (error) {
      throw error;
    }
  }

  static async getAvailableTimeSlots(doctorId, date) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const availability = doctor.availability[dayName];

      if (!availability || !availability.available) {
        return [];
      }

      // Get existing appointments for the date
      const existingAppointments = await Appointment.find({
        doctor: doctorId,
        appointmentDate: {
          $gte: new Date(date).setHours(0, 0, 0, 0),
          $lt: new Date(date).setHours(23, 59, 59, 999)
        },
        status: { $in: ['pending', 'confirmed'] }
      });

      // Generate available time slots (simplified logic)
      const slots = [];
      const startHour = parseInt(availability.start.split(':')[0]);
      const endHour = parseInt(availability.end.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const isBooked = existingAppointments.some(apt => 
          apt.timeSlot.start === timeSlot
        );
        
        if (!isBooked) {
          slots.push({
            start: timeSlot,
            end: `${(hour + 1).toString().padStart(2, '0')}:00`
          });
        }
      }
      // console.log(slots);
      return slots;
    } catch (error) {
      throw error;
    }
  }
}