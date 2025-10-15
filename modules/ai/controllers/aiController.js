import { aiDiagnosisService } from '../services/aiDiagnosisService.js';
import { asyncHandler } from '../../../middlewares/errorHandler.js';
import { sendResponse, sendError } from '../../../utils/responseHelper.js';
import SystemLog from '../../admin/models/SystemLog.js';

export const analyzeSymptoms = asyncHandler(async (req, res) => {
  const { symptoms, patientAge, patientGender, medicalHistory } = req.body;
  
  try {
    const analysis = await aiDiagnosisService.analyzeSymptoms(
      symptoms, 
      patientAge, 
      patientGender, 
      medicalHistory
    );

    // Log AI analysis
    await SystemLog.createLog({
      level: 'info',
      category: 'ai',
      action: 'symptoms_analyzed',
      performedBy: {
        userId: req.user._id,
        userType: req.user.role || 'user'
      },
      targetEntity: 'user',
      targetId: req.user._id,
      details: {
        symptoms,
        diagnosis: analysis.primaryCondition,
        confidence: analysis.confidence,
        riskLevel: analysis.riskLevel
      }
    }, req);

    // If high risk, notify admin
    if (analysis.riskLevel === 'high' || analysis.urgency === 'emergency') {
      const { NotificationService } = await import('../../admin/services/notificationService.js');
      await NotificationService.notifyHighRiskPatient(req.user._id, {
        symptoms,
        diagnosis: analysis.primaryCondition,
        confidence: analysis.confidence
      });
    }

    sendResponse(res, 200, true, 'Symptoms analyzed successfully', { analysis });
  } catch (error) {
    await SystemLog.createLog({
      level: 'error',
      category: 'ai',
      action: 'analysis_failed',
      performedBy: {
        userId: req.user._id,
        userType: req.user.role || 'user'
      },
      targetEntity: 'system',
      targetId: req.user._id,
      details: {
        error: error.message,
        symptoms
      }
    }, req);

    throw error;
  }
});

export const getPendingAnalyses = asyncHandler(async (req, res) => {
  // Mock pending analyses for doctor review
  const pendingAnalyses = [
    {
      id: '1',
      patientId: 'patient-1',
      patientName: 'John Smith',
      symptoms: ['persistent headache', 'fatigue', 'dizziness'],
      aiDiagnosis: {
        primaryCondition: 'Tension Headache',
        confidence: 0.85,
        riskLevel: 'medium',
        recommendations: [
          'Rest and stress management',
          'Over-the-counter pain relievers',
          'Monitor symptoms for 48 hours'
        ],
        urgency: 'routine'
      },
      doctorReview: null,
      timestamp: new Date(),
      status: 'pending'
    }
  ];

  sendResponse(res, 200, true, 'Pending analyses retrieved successfully', { analyses: pendingAnalyses });
});

export const reviewAnalysis = asyncHandler(async (req, res) => {
  const { analysisId } = req.params;
  const { approved, modified, finalDiagnosis, notes } = req.body;

  // Log doctor review
  await SystemLog.createLog({
    level: 'info',
    category: 'ai',
    action: 'analysis_reviewed',
    performedBy: {
      userId: req.user._id,
      userType: 'doctor'
    },
    targetEntity: 'system',
    targetId: analysisId,
    details: {
      approved,
      modified,
      finalDiagnosis,
      notes,
      reviewedBy: req.user.email
    }
  }, req);

  sendResponse(res, 200, true, 'Analysis reviewed successfully');
});

export const getPatientAnalysisHistory = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  
  // Mock analysis history
  const analyses = [];

  sendResponse(res, 200, true, 'Patient analysis history retrieved successfully', { analyses });
});

export const getModelMetrics = asyncHandler(async (req, res) => {
  // Mock AI model metrics
  const metrics = {
    accuracy: 0.94,
    precision: 0.91,
    recall: 0.89,
    f1Score: 0.90,
    totalAnalyses: 15420,
    correctPredictions: 14495,
    doctorOverrideRate: 0.12,
    averageConfidence: 0.87,
    lastUpdated: new Date()
  };

  sendResponse(res, 200, true, 'AI model metrics retrieved successfully', { metrics });
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { analysisId } = req.params;
  const feedback = req.body;

  // Log feedback submission
  await SystemLog.createLog({
    level: 'info',
    category: 'ai',
    action: 'feedback_submitted',
    performedBy: {
      userId: req.user._id,
      userType: req.user.role || 'doctor'
    },
    targetEntity: 'system',
    targetId: analysisId,
    details: {
      feedback,
      submittedBy: req.user.email
    }
  }, req);

  sendResponse(res, 200, true, 'Feedback submitted successfully');
});