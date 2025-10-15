import express from 'express';
import multer from 'multer';
import {
  registerLab,
  loginLab,
  logoutLab,
  getLabProfile,
  updateLabProfile,
  uploadLabReport,
  getLabReports,
  updateReportStatus,
  shareReportWithDoctor,
  getLabStats,
  getLabAnalytics,
  performQualityControl,
  getAvailableLabs,
  createLabRequest,
  getAllLabRequests,
  updateLabRequestStatus,
  assignLabToRequest,
  getPatientReports,
  getDoctorOrderedReports
} from '../controllers/labController.js';
import { authenticate, authorize } from '../../../middlewares/authMiddleware.js';
import { 
  validateLabRegistration,
  validateLabLogin,
  validateLabReportUpload,
  validateQualityControl
} from '../validations/labValidation.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/lab-reports/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/dicom'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and DICOM files are allowed.'));
    }
  }
});

// Public routes
router.post('/register', validateLabRegistration, registerLab);
router.post('/login', validateLabLogin, loginLab);
router.get('/available', getAvailableLabs);

// Authentication routes
router.post('/logout', logoutLab);

// Protected routes for labs
router.use('/profile', authenticate, authorize('lab'));
router.use('/reports', authenticate, authorize('lab'));
router.use('/stats', authenticate, authorize('lab'));
router.use('/analytics', authenticate, authorize('lab'));
router.use('/requests', authenticate);

// Lab profile management
router.get('/profile', authenticate, authorize('lab'), getLabProfile);
router.put('/profile', authenticate, authorize('lab'), updateLabProfile);

// Report management
router.post('/reports/upload', authenticate, authorize('lab'), upload.array('reportFiles', 5), uploadLabReport);
router.get('/reports', authenticate, authorize('lab'), getLabReports);
router.put('/reports/:reportId/status', authenticate, authorize('lab'), updateReportStatus);
router.post('/reports/:reportId/share-doctor', authenticate, authorize('lab'), shareReportWithDoctor);
router.put('/reports/:reportId/quality-control', authenticate, authorize('lab'), performQualityControl);

// Analytics and stats
router.get('/stats', authenticate, authorize('lab'), getLabStats);
router.get('/analytics', authenticate, authorize('lab'), getLabAnalytics);

// Cross-module routes (accessible by doctors/admins)
router.post('/requests', authenticate, createLabRequest);
router.get('/requests/all', authenticate, getAllLabRequests);
router.put('/requests/:requestId/assign', authenticate, assignLabToRequest);
router.put('/requests/:requestId/status', authenticate, authorize('lab'), updateLabRequestStatus);
router.get('/patients/:patientId/reports', authenticate, getPatientReports);
router.get('/doctors/:doctorId/reports', authenticate, getDoctorOrderedReports);

export default router;