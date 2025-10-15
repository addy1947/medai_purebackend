import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Lab from '../models/Lab.js';
import LabReport from '../models/LabReport.js';
import LabRequest from '../models/LabRequest.js';
import User from '../../user/models/User.js';
import Doctor from '../../doctor/models/Doctor.js';
import SystemLog from '../../admin/models/SystemLog.js';
import { LabHelper } from '../utils/labHelper.js';

export class LabService {
  static generateToken(labId) {
    return jwt.sign({ id: labId, role: 'lab' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static async createLab(labData) {
    try {
      const existingLab = await Lab.findOne({ email: labData.email });
      if (existingLab) {
        throw new Error('Lab already exists with this email');
      }

      const existingLicense = await Lab.findOne({ licenseNumber: labData.licenseNumber });
      if (existingLicense) {
        throw new Error('Lab already exists with this license number');
      }

      const lab = new Lab(labData);
      await lab.save();
      
      // Log lab registration
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'lab_registered',
        performedBy: {
          userType: 'system'
        },
        targetEntity: 'lab',
        targetId: lab._id,
        details: {
          labName: lab.name,
          licenseNumber: lab.licenseNumber,
          email: lab.email
        }
      });

      return lab;
    } catch (error) {
      throw error;
    }
  }

  static async authenticateLab(email, password) {
    try {
      const lab = await Lab.findOne({ email }).select('+password');
      if (!lab) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await lab.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      lab.lastLogin = new Date();
      await lab.save();

      return lab;
    } catch (error) {
      throw error;
    }
  }

  static async uploadLabReport(labId, reportData, files) {
    try {
      const lab = await Lab.findById(labId);
      if (!lab) {
        throw new Error('Lab not found');
      }

      // Verify patient exists
      const patient = await User.findById(reportData.patient);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Verify doctor exists if provided
      if (reportData.doctor) {
        const doctor = await Doctor.findById(reportData.doctor);
        if (!doctor) {
          throw new Error('Doctor not found');
        }
      }

      // Generate report number
      const reportNumber = LabHelper.generateReportNumber();

      // Process test parameters for abnormal values
      let processedParameters = [];
      if (reportData.testParameters) {
        processedParameters = reportData.testParameters.map(param => {
          const abnormalCheck = LabHelper.checkAbnormalValues(param.parameter, param.value, param.unit);
          return {
            ...param,
            isAbnormal: abnormalCheck.isAbnormal,
            flagType: abnormalCheck.flagType
          };
        });
      }

      // Create lab report
      const labReport = new LabReport({
        ...reportData,
        reportNumber,
        lab: labId,
        testParameters: processedParameters,
        files: files.map(file => ({
          fileName: file.originalname,
          fileUrl: file.path,
          fileType: file.mimetype,
          fileSize: file.size
        })),
        results: {
          ...reportData.results,
          summary: reportData.results.summary || LabHelper.generateReportSummary(processedParameters, reportData.testType)
        },
        ocrData: {
          aiAnalysis: LabHelper.generateAIAnalysis(processedParameters, reportData.testType)
        }
      });

      await labReport.save();

      // Update lab statistics
      await Lab.findByIdAndUpdate(labId, {
        $inc: { totalReports: 1 }
      });

      // Add to patient's health vault
      const healthVaultEntry = LabHelper.formatReportForHealthVault(labReport);
      await User.findByIdAndUpdate(reportData.patient, {
        $push: { labReports: healthVaultEntry }
      });

      // Notify patient about new report
      await this.notifyPatientReportReady(labReport._id);
      
      // Notify doctor if report was ordered by them
      if (reportData.doctor) {
        await this.notifyDoctorReportReady(labReport._id);
      }

      // Log report upload
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'report_uploaded',
        performedBy: {
          userId: labId,
          userType: 'lab'
        },
        targetEntity: 'user',
        targetId: reportData.patient,
        details: {
          reportId: labReport._id,
          testName: labReport.testName,
          labName: lab.name
        }
      });

      return labReport;
    } catch (error) {
      throw error;
    }
  }

  static async getLabReports(labId, filters = {}) {
    try {
      const query = { lab: labId };
      
      if (filters.status) query.status = filters.status;
      if (filters.testType) query.testType = filters.testType;
      if (filters.startDate && filters.endDate) {
        query.reportDate = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      const reports = await LabReport.find(query)
        .populate('patient', 'fullName email phone age gender')
        .populate('doctor', 'fullName specialization')
        .sort({ reportDate: -1 })
        .limit(filters.limit || 50);

      return reports;
    } catch (error) {
      throw error;
    }
  }

  static async updateReportStatus(reportId, status, labId) {
    try {
      const report = await LabReport.findOneAndUpdate(
        { _id: reportId, lab: labId },
        { 
          status,
          ...(status === 'Delivered' && { actualDeliveryDate: new Date() })
        },
        { new: true }
      );

      if (!report) {
        throw new Error('Report not found or access denied');
      }

      // Log status update
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'report_status_updated',
        performedBy: {
          userId: labId,
          userType: 'lab'
        },
        targetEntity: 'lab_report',
        targetId: reportId,
        details: {
          newStatus: status,
          reportNumber: report.reportNumber
        }
      });

      return report;
    } catch (error) {
      throw error;
    }
  }

  static async shareReportWithDoctor(reportId, doctorId, labId) {
    try {
      const report = await LabReport.findOneAndUpdate(
        { _id: reportId, lab: labId },
        { 
          'sharing.sharedWithDoctor': true,
          'sharing.doctorAccessDate': new Date(),
          'notifications.doctorNotified': true
        },
        { new: true }
      );

      if (!report) {
        throw new Error('Report not found or access denied');
      }

      // Log sharing action
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'report_shared_with_doctor',
        performedBy: {
          userId: labId,
          userType: 'lab'
        },
        targetEntity: 'doctor',
        targetId: doctorId,
        details: {
          reportId,
          reportNumber: report.reportNumber,
          testName: report.testName
        }
      });

      return report;
    } catch (error) {
      throw error;
    }
  }

  static async getLabStats(labId) {
    try {
      const lab = await Lab.findById(labId);
      
      const [
        totalReports,
        pendingReports,
        completedReports,
        todayReports,
        averageTurnaround
      ] = await Promise.all([
        LabReport.countDocuments({ lab: labId }),
        LabReport.countDocuments({ lab: labId, status: { $in: ['Sample Collected', 'Processing'] } }),
        LabReport.countDocuments({ lab: labId, status: 'Completed' }),
        LabReport.countDocuments({
          lab: labId,
          reportDate: {
            $gte: new Date().setHours(0, 0, 0, 0),
            $lt: new Date().setHours(23, 59, 59, 999)
          }
        }),
        this.calculateAverageTurnaround(labId)
      ]);

      return {
        totalReports,
        pendingReports,
        completedReports,
        todayReports,
        averageTurnaround,
        rating: lab.rating,
        totalRevenue: lab.totalRevenue || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async calculateAverageTurnaround(labId) {
    try {
      const completedReports = await LabReport.find({
        lab: labId,
        status: 'Completed',
        sampleCollectionDate: { $exists: true },
        actualDeliveryDate: { $exists: true }
      });

      if (completedReports.length === 0) return 24; // Default 24 hours

      const totalTime = completedReports.reduce((sum, report) => {
        const turnaround = report.actualDeliveryDate - report.sampleCollectionDate;
        return sum + turnaround;
      }, 0);

      // Return average in hours
      return Math.round(totalTime / completedReports.length / (1000 * 60 * 60));
    } catch (error) {
      return 24;
    }
  }

  static async getLabAnalytics(labId, period = 'month') {
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
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const [reportTrends, testTypeDistribution, turnaroundTimes] = await Promise.all([
        this.getReportTrends(labId, startDate),
        this.getTestTypeDistribution(labId, startDate),
        this.getTurnaroundAnalytics(labId, startDate)
      ]);

      return {
        reportTrends,
        testTypeDistribution,
        turnaroundTimes,
        period
      };
    } catch (error) {
      throw error;
    }
  }

  static async getReportTrends(labId, startDate) {
    const reports = await LabReport.aggregate([
      {
        $match: {
          lab: new mongoose.Types.ObjectId(labId),
          reportDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$reportDate' },
            month: { $month: '$reportDate' },
            day: { $dayOfMonth: '$reportDate' }
          },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return reports;
  }

  static async getTestTypeDistribution(labId, startDate) {
    const distribution = await LabReport.aggregate([
      {
        $match: {
          lab: new mongoose.Types.ObjectId(labId),
          reportDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$testType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return distribution;
  }

  static async getTurnaroundAnalytics(labId, startDate) {
    const turnaroundData = await LabReport.aggregate([
      {
        $match: {
          lab: new mongoose.Types.ObjectId(labId),
          reportDate: { $gte: startDate },
          sampleCollectionDate: { $exists: true },
          actualDeliveryDate: { $exists: true }
        }
      },
      {
        $project: {
          testType: 1,
          turnaroundHours: {
            $divide: [
              { $subtract: ['$actualDeliveryDate', '$sampleCollectionDate'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: '$testType',
          averageTurnaround: { $avg: '$turnaroundHours' },
          count: { $sum: 1 }
        }
      }
    ]);

    return turnaroundData;
  }

  static async performQualityControl(reportId, qualityData, labId) {
    try {
      const report = await LabReport.findOneAndUpdate(
        { _id: reportId, lab: labId },
        {
          qualityControl: {
            ...qualityData,
            reviewDate: new Date()
          }
        },
        { new: true }
      );

      if (!report) {
        throw new Error('Report not found or access denied');
      }

      // Log quality control
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'quality_control_performed',
        performedBy: {
          userId: labId,
          userType: 'lab'
        },
        targetEntity: 'lab_report',
        targetId: reportId,
        details: {
          qualityScore: qualityData.qualityScore,
          reviewedBy: qualityData.reviewedBy
        }
      });

      return report;
    } catch (error) {
      throw error;
    }
  }

  static async getAvailableLabs(location = null, testType = null) {
    try {
      const query = { isApproved: true, isActive: true };
      
      if (testType) {
        query.services = { $in: [testType] };
      }

      if (location) {
        query.$or = [
          { 'address.city': { $regex: location, $options: 'i' } },
          { 'address.state': { $regex: location, $options: 'i' } }
        ];
      }

      const labs = await Lab.find(query)
        .select('name contactInfo address services rating operatingHours')
        .sort({ 'rating.average': -1 });

      return labs;
    } catch (error) {
      throw error;
    }
  }

  static async createLabRequest(requestData) {
    try {
      const request = new LabRequest(requestData);
      await request.save();

      // Log lab request creation
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'lab_request_created',
        performedBy: {
          userId: requestData.doctor,
          userType: 'doctor'
        },
        targetEntity: 'user',
        targetId: requestData.patient,
        details: {
          requestId: request._id,
          testsRequested: request.testsRequested.map(t => t.testName)
        }
      });

      return request;
    } catch (error) {
      throw error;
    }
  }

  static async assignLabToRequest(requestId, labId) {
    try {
      const request = await LabRequest.findByIdAndUpdate(
        requestId,
        { 
          lab: labId,
          status: 'Lab Assigned'
        },
        { new: true }
      );

      if (!request) {
        throw new Error('Lab request not found');
      }

      return request;
    } catch (error) {
      throw error;
    }
  }

  static async getLabRequests(labId, status = null) {
    try {
      const query = { lab: labId };
      if (status) query.status = status;

      const requests = await LabRequest.find(query)
        .populate('patient', 'fullName email phone age gender')
        .populate('doctor', 'fullName specialization')
        .sort({ requestDate: -1 });

      return requests;
    } catch (error) {
      throw error;
    }
  }

  static async getAllLabRequests(status = null) {
    try {
      const query = {};
      if (status) query.status = status;

      const requests = await LabRequest.find(query)
        .populate('patient', 'fullName email phone age gender')
        .populate('doctor', 'fullName specialization')
        .populate('lab', 'name contactInfo')
        .sort({ requestDate: -1 });

      return requests;
    } catch (error) {
      throw error;
    }
  }

  static async updateLabRequestStatus(requestId, status, labId, notes = '') {
    try {
      const request = await LabRequest.findOneAndUpdate(
        { _id: requestId, lab: labId },
        { 
          status,
          notes,
          ...(status === 'Sample Collected' && { sampleCollectionDate: new Date() })
        },
        { new: true }
      );

      if (!request) {
        throw new Error('Lab request not found or access denied');
      }

      // Log status update
      await SystemLog.createLog({
        level: 'info',
        category: 'lab_management',
        action: 'request_status_updated',
        performedBy: {
          userId: labId,
          userType: 'lab'
        },
        targetEntity: 'lab_request',
        targetId: requestId,
        details: {
          newStatus: status,
          requestNumber: request.requestNumber,
          notes
        }
      });

      return request;
    } catch (error) {
      throw error;
    }
  }

  static async updateLabProfile(labId, updateData) {
    try {
      const lab = await Lab.findByIdAndUpdate(
        labId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!lab) {
        throw new Error('Lab not found');
      }

      return lab;
    } catch (error) {
      throw error;
    }
  }

  static async getPatientReports(patientId, labId = null) {
    try {
      const query = { patient: patientId };
      if (labId) query.lab = labId;

      const reports = await LabReport.find(query)
        .populate('lab', 'name contactInfo')
        .populate('doctor', 'fullName specialization')
        .sort({ reportDate: -1 });

      return reports;
    } catch (error) {
      throw error;
    }
  }

  static async getDoctorOrderedReports(doctorId, labId = null) {
    try {
      const query = { doctor: doctorId };
      if (labId) query.lab = labId;

      const reports = await LabReport.find(query)
        .populate('patient', 'fullName email age gender')
        .populate('lab', 'name')
        .sort({ reportDate: -1 });

      return reports;
    } catch (error) {
      throw error;
    }
  }

  static async notifyPatientReportReady(reportId) {
    try {
      const report = await LabReport.findById(reportId)
        .populate('patient', 'fullName email phone')
        .populate('lab', 'name');

      if (!report) {
        throw new Error('Report not found');
      }

      // Update notification status
      await LabReport.findByIdAndUpdate(reportId, {
        'notifications.patientNotified': true,
        'notifications.notificationDate': new Date(),
        'sharing.sharedWithPatient': true,
        'sharing.patientAccessDate': new Date()
      });

      // In production, send actual notification (email/SMS)
      console.log(`Notifying patient ${report.patient.fullName} about report ${report.reportNumber}`);

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async notifyDoctorReportReady(reportId) {
    try {
      const report = await LabReport.findById(reportId)
        .populate('doctor', 'fullName email')
        .populate('lab', 'name');

      if (!report || !report.doctor) {
        return false;
      }

      // Update notification status
      await LabReport.findByIdAndUpdate(reportId, {
        'notifications.doctorNotified': true,
        'sharing.sharedWithDoctor': true,
        'sharing.doctorAccessDate': new Date()
      });

      // In production, send actual notification
      console.log(`Notifying doctor ${report.doctor.fullName} about report ${report.reportNumber}`);

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async processOCR(reportId) {
    try {
      const report = await LabReport.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Mock OCR processing (in production, integrate with OCR service)
      const mockOCRData = {
        extractedText: 'Sample OCR extracted text from lab report',
        confidence: 0.95,
        processedDate: new Date(),
        aiAnalysis: {
          keyFindings: ['Hemoglobin: 12.5 g/dL', 'WBC: 7200/μL', 'Platelets: 250,000/μL'],
          riskLevel: 'Low',
          recommendations: ['Values within normal range', 'Continue regular monitoring']
        }
      };

      report.ocrData = mockOCRData;
      await report.save();

      return mockOCRData;
    } catch (error) {
      throw error;
    }
  }
}