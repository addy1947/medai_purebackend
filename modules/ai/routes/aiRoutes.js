import express from 'express';
import {
  analyzeSymptoms,
  getPendingAnalyses,
  reviewAnalysis,
  getPatientAnalysisHistory,
  getModelMetrics,
  submitFeedback
} from '../controllers/aiController.js';
import { authenticate } from '../../../middlewares/authMiddleware.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(authenticate);

// AI analysis routes
router.post('/analyze-symptoms', analyzeSymptoms);
router.get('/pending-analyses', getPendingAnalyses);
router.put('/analyses/:analysisId/review', reviewAnalysis);
router.get('/patient/:patientId/analyses', getPatientAnalysisHistory);
router.get('/model-metrics', getModelMetrics);
router.post('/analyses/:analysisId/feedback', submitFeedback);

export default router;