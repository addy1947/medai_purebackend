import jwt from 'jsonwebtoken';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import Earnings from '../models/Earnings.js';

export class DoctorService {
  static generateToken(doctorId) {
    return jwt.sign({ id: doctorId, role: 'doctor' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
  }

  static async createDoctor(doctorData) {
    try {
      const existingDoctor = await Doctor.findOne({ email: doctorData.email });
      if (existingDoctor) {
        throw new Error('Doctor already exists with this email');
      }

      const existingLicense = await Doctor.findOne({ licenseNumber: doctorData.licenseNumber });
      if (existingLicense) {
        throw new Error('Doctor already exists with this license number');
      }

      const doctor = new Doctor(doctorData);
      await doctor.save();
      
      return doctor;
    } catch (error) {
      throw error;
    }
  }

  static async authenticateDoctor(email, password) {
    try {
      const doctor = await Doctor.findOne({ email }).select('+password');
      if (!doctor) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await doctor.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      doctor.lastLogin = new Date();
      await doctor.save();

      return doctor;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorById(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }
      return doctor;
    } catch (error) {
      throw error;
    }
  }

  static async updateDoctor(doctorId, updateData) {
    try {
      const doctor = await Doctor.findByIdAndUpdate(
        doctorId, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!doctor) {
        throw new Error('Doctor not found');
      }
      
      return doctor;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorAppointments(doctorId, status = null) {
    try {
      const query = { doctor: doctorId };
      if (status) query.status = status;

 
      const appointments = await Appointment.find(query)
        .populate('patient', 'fullName email phone age gender')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      throw error;
    }
  }

  static async updateAppointmentStatus(appointmentId, status, notes = '') {
    try {
     
      const appointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { status, notes },
        { new: true }
      ).populate('patient', 'fullName email phone');
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      return appointment;
    } catch (error) {
      throw error;
    }
  }


  static async updateAvailability(doctorId,availbility){
try {
 const availabilityObj = {};
availbility.forEach(item => {
  const dayKey = item.day.toLowerCase(); // e.g., 'monday'
  availabilityObj[dayKey] = {
    start: item.start,
    end: item.end,
    available: item.available
  };
});

  const doctor = await Doctor.findByIdAndUpdate(
        doctorId, 
        { availability: availabilityObj }, 
        { new: true, runValidators: true }
      );
      const availabilityData =doctor.availability
      if (!availabilityData) {
        throw new Error('Availability not updated');
      }

      await doctor.save()


      return availabilityData;
  
} catch (error) {
   throw error;
}
  }

  static async createPrescription(prescriptionData) {
    try {
      const prescription = new Prescription(prescriptionData);
      await prescription.save();
      
      // Update appointment with prescription reference
      if (prescriptionData.appointment) {
        await Appointment.findByIdAndUpdate(
          prescriptionData.appointment,
          { prescription: prescription._id }
        );
      }
      
      return prescription;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorPrescriptions(doctorId) {
    try {
      const prescriptions = await Prescription.find({ doctor: doctorId })
        .populate('patient', 'fullName email phone')
        .populate('appointment', 'appointmentDate')
        .sort({ createdAt: -1 });
      
      return prescriptions;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorEarnings(doctorId, month = null, year = null) {
    try {
      const query = { doctor: doctorId };
      if (month) query.month = month;
      if (year) query.year = year;

      const earnings = await Earnings.find(query)
        .populate('appointment', 'appointmentDate')
        .populate('patient', 'fullName')
        .sort({ createdAt: -1 });
      
      return earnings;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorStats(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
     
      const totalAppointments = await Appointment.countDocuments({ doctor: doctorId });
      const completedAppointments = await Appointment.countDocuments({ 
        doctor: doctorId, 
        status: 'completed' 
      });
      const todayAppointments = await Appointment.countDocuments({
        doctor: doctorId,
        appointmentDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      });
      const totalPrescriptions = await Prescription.countDocuments({ doctor: doctorId });

      return {
        totalPatients: doctor.totalPatients,
        totalAppointments,
        completedAppointments,
        todayAppointments,
        totalPrescriptions,
        totalEarnings: doctor.totalEarnings,
        rating: doctor.rating
      };
    } catch (error) {
      throw error
    }
  }

  static async getAvailableDoctors(search = null) {
    try {
      // const query = { isVerified: true, isActive: true };
      // if (specialization) query.specialization = specialization;
      
      // const doctors = await Doctor.find(query)
      //   .select('fullName specialization consultationFee rating experience clinicDetails')
      //   .sort({ 'rating.average': -1 });
      
    

const keyword=search ? {
    $or:[
{
    name:{ $regex :search , $options:"i"}
}
,{specialization:{ $regex :search , $options:"i"}}
    ]

}:{}

      const doctors = await Doctor.find(keyword)
        .select('fullName specialization consultationFee rating experience clinicDetails')
        .sort({ 'rating.average': -1 });


      return doctors;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorPatients(doctorId) {
    try {
      // Get patients who have appointments with this doctor
      const appointments = await Appointment.find({ doctor: doctorId })
        .populate('patient')
        .distinct('patient');
      
      return appointments;
    } catch (error) {
      throw error;
    }
  }

  static async getPatientHealthVault(doctorId, patientId) {
    try {
      // Check if doctor has access to patient's health vault
      const hasAccess = await this.checkHealthVaultAccess(doctorId, patientId);
      if (!hasAccess) {
        throw new Error('Access denied. Please request health vault access.');
      }

      const patient = await User.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      return {
        medicalHistory: patient.medicalHistory,
        prescriptions: patient.prescriptions,
        labReports: patient.labReports
      };
    } catch (error) {
      throw error;
    }
  }

  static async checkHealthVaultAccess(doctorId, patientId) {
    // Check if doctor has had appointments with patient
    const appointment = await Appointment.findOne({
      doctor: doctorId,
      patient: patientId
    });
    
    return !!appointment;
  }

  static async requestHealthVaultAccess(doctorId, patientId) {
    try {
      // In a real implementation, this would create a request for admin approval
      // For now, we'll simulate the request
      console.log(`Doctor ${doctorId} requesting access to patient ${patientId} health vault`);
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getHealthVaultRequests(doctorId) {
    try {
      // Mock implementation - would fetch from a requests collection
      return [];
    } catch (error) {
      throw error;
    }
  }

  static async generatePrescriptionQR(prescriptionId) {
    try {
      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription) {
        throw new Error('Prescription not found');
      }

      // Generate QR code data (would use a QR library in production)
      const qrData = {
        prescriptionId,
        doctorId: prescription.doctor,
        patientId: prescription.patient,
        timestamp: new Date().toISOString()
      };

      // Update prescription with QR code
      prescription.qrCode = JSON.stringify(qrData);
      await prescription.save();

      return qrData;
    } catch (error) {
      throw error;
    }
  }

  static async sendPrescriptionToPharmacy(prescriptionId) {
    try {
      const prescription = await Prescription.findById(prescriptionId)
        .populate('patient', 'fullName phone email')
        .populate('doctor', 'fullName licenseNumber');

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      // In production, this would integrate with pharmacy APIs
      console.log('Sending prescription to pharmacy:', prescriptionId);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}