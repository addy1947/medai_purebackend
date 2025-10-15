import DoctorApproval from '../models/DoctorApproval.js';
import Doctor from '../../doctor/models/Doctor.js';
import SystemLog from '../models/SystemLog.js';
import { logger } from '../../../utils/logger.js';

export class DoctorApprovalWorkflow {
  static async initiateDoctorApproval(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Check if approval record already exists
      const existingApproval = await DoctorApproval.findOne({ doctor: doctorId });
      if (existingApproval) {
        return existingApproval;
      }

      // Create new approval record
      const approval = new DoctorApproval({
        doctor: doctorId,
        status: 'pending',
        priority: this.calculatePriority(doctor),
        submissionDate: new Date()
      });

      await approval.save();

      // Log approval initiation
      await SystemLog.createLog({
        level: 'info',
        category: 'doctor_management',
        action: 'approval_workflow_initiated',
        performedBy: {
          userType: 'system'
        },
        targetEntity: 'doctor',
        targetId: doctorId,
        details: {
          doctorEmail: doctor.email,
          specialization: doctor.specialization,
          priority: approval.priority
        }
      });

      logger.info(`Doctor approval workflow initiated for ${doctor.email}`);
      return approval;
    } catch (error) {
      logger.error('Error initiating doctor approval workflow:', error);
      throw error;
    }
  }

  static calculatePriority(doctor) {
    let priority = 'medium';
    
    // High priority for emergency specializations
    const emergencySpecs = ['Emergency Medicine', 'Cardiology', 'Neurology'];
    if (emergencySpecs.includes(doctor.specialization)) {
      priority = 'high';
    }
    
    // High priority for experienced doctors
    if (doctor.experience >= 15) {
      priority = 'high';
    }
    
    // Urgent for certain specializations with high demand
    if (doctor.specialization === 'Pediatrics' && doctor.experience >= 10) {
      priority = 'urgent';
    }
    
    return priority;
  }

  static async assignReviewer(approvalId, adminId) {
    try {
      const approval = await DoctorApproval.findByIdAndUpdate(
        approvalId,
        {
          assignedTo: adminId,
          status: 'under_review',
          reviewStartDate: new Date()
        },
        { new: true }
      );

      if (!approval) {
        throw new Error('Approval record not found');
      }

      await SystemLog.createLog({
        level: 'info',
        category: 'doctor_management',
        action: 'reviewer_assigned',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'doctor',
        targetId: approval.doctor,
        details: {
          approvalId,
          assignedReviewer: adminId
        }
      });

      return approval;
    } catch (error) {
      throw error;
    }
  }

  static async requestAdditionalDocuments(approvalId, requiredDocs, adminId) {
    try {
      const approval = await DoctorApproval.findByIdAndUpdate(
        approvalId,
        {
          status: 'additional_docs_required',
          additionalDocsRequired: requiredDocs
        },
        { new: true }
      );

      if (!approval) {
        throw new Error('Approval record not found');
      }

      // Log document request
      await SystemLog.createLog({
        level: 'info',
        category: 'doctor_management',
        action: 'additional_docs_requested',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'doctor',
        targetId: approval.doctor,
        details: {
          requiredDocuments: requiredDocs,
          approvalId
        }
      });

      return approval;
    } catch (error) {
      throw error;
    }
  }

  static async verifyDocument(approvalId, documentType, verified, adminId, notes = '') {
    try {
      const approval = await DoctorApproval.findById(approvalId);
      if (!approval) {
        throw new Error('Approval record not found');
      }

      // Update document verification status
      const documentIndex = approval.documents.findIndex(doc => doc.type === documentType);
      if (documentIndex !== -1) {
        approval.documents[documentIndex].verified = verified;
        approval.documents[documentIndex].verifiedBy = adminId;
        approval.documents[documentIndex].verificationDate = new Date();
        approval.documents[documentIndex].verificationNotes = notes;
      }

      // Calculate overall verification score
      const totalDocs = approval.documents.length;
      const verifiedDocs = approval.documents.filter(doc => doc.verified).length;
      approval.verificationScore = totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0;

      await approval.save();

      // Log document verification
      await SystemLog.createLog({
        level: 'info',
        category: 'doctor_management',
        action: 'document_verified',
        performedBy: {
          userId: adminId,
          userType: 'admin'
        },
        targetEntity: 'doctor',
        targetId: approval.doctor,
        details: {
          documentType,
          verified,
          verificationScore: approval.verificationScore,
          notes
        }
      });

      return approval;
    } catch (error) {
      throw error;
    }
  }

  static async getApprovalMetrics() {
    try {
      const [
        totalPending,
        totalUnderReview,
        totalApproved,
        totalRejected,
        averageReviewTime
      ] = await Promise.all([
        DoctorApproval.countDocuments({ status: 'pending' }),
        DoctorApproval.countDocuments({ status: 'under_review' }),
        DoctorApproval.countDocuments({ status: 'approved' }),
        DoctorApproval.countDocuments({ status: 'rejected' }),
        this.calculateAverageReviewTime()
      ]);

      return {
        pending: totalPending,
        underReview: totalUnderReview,
        approved: totalApproved,
        rejected: totalRejected,
        averageReviewTime,
        approvalRate: totalApproved + totalRejected > 0 
          ? ((totalApproved / (totalApproved + totalRejected)) * 100).toFixed(1)
          : 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async calculateAverageReviewTime() {
    const completedApprovals = await DoctorApproval.find({
      status: { $in: ['approved', 'rejected'] },
      reviewStartDate: { $exists: true },
      reviewCompletionDate: { $exists: true }
    });

    if (completedApprovals.length === 0) return 0;

    const totalTime = completedApprovals.reduce((sum, approval) => {
      const reviewTime = approval.reviewCompletionDate - approval.reviewStartDate;
      return sum + reviewTime;
    }, 0);

    // Return average time in hours
    return Math.round(totalTime / completedApprovals.length / (1000 * 60 * 60));
  }
}