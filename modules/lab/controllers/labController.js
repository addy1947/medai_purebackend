import { LabService } from '../services/labService.js';
import { asyncHandler } from '../../../middlewares/errorHandler.js';
import { sendResponse, sendError } from '../../../utils/responseHelper.js';
import Lab from '../models/Lab.js';
import LabReport from '../models/LabReport.js';
import LabRequest from '../models/LabRequest.js';

export const registerLab = asyncHandler(async (req, res) => {
  const lab = await LabService.createLab(req.body);
  const token = LabService.generateToken(lab._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  sendResponse(res, 201, true, 'Lab registered successfully. Approval pending.', { lab, token });
});

export const loginLab = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const lab = await LabService.authenticateLab(email, password);
  const token = LabService.generateToken(lab._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  sendResponse(res, 200, true, 'Login successful', { lab, token });
});

export const logoutLab = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  sendResponse(res, 200, true, 'Logout successful');
});

export const getLabProfile = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.user._id);
  sendResponse(res, 200, true, 'Lab profile retrieved successfully', { lab });
});

export const updateLabProfile = asyncHandler(async (req, res) => {
  const lab = await LabService.updateLabProfile(req.user._id, req.body);
  sendResponse(res, 200, true, 'Lab profile updated successfully', { lab });
});

export const uploadLabReport = asyncHandler(async (req, res) => {
  const files = req.files || [];
  
  // Parse JSON fields from form data
  if (req.body.results && typeof req.body.results === 'string') {
    req.body.results = JSON.parse(req.body.results);
  }
  if (req.body.technician && typeof req.body.technician === 'string') {
    req.body.technician = JSON.parse(req.body.technician);
  }
  if (req.body.pathologist && typeof req.body.pathologist === 'string') {
    req.body.pathologist = JSON.parse(req.body.pathologist);
  }
  if (req.body.testParameters && typeof req.body.testParameters === 'string') {
    req.body.testParameters = JSON.parse(req.body.testParameters);
  }
  
  const report = await LabService.uploadLabReport(req.user._id, req.body, files);
  
  // Process OCR in background
  LabService.processOCR(report._id).catch(console.error);
  
  // Notify patient and doctor
  LabService.notifyPatientReportReady(report._id).catch(console.error);
  if (req.body.doctor) {
    LabService.notifyDoctorReportReady(report._id).catch(console.error);
  }

  sendResponse(res, 201, true, 'Lab report uploaded successfully', { report });
});

export const getLabReports = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    testType: req.query.testType,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    limit: req.query.limit
  };

  const reports = await LabService.getLabReports(req.user._id, filters);
  sendResponse(res, 200, true, 'Lab reports retrieved successfully', { reports });
});

export const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  const report = await LabService.updateReportStatus(reportId, status, req.user._id);
  sendResponse(res, 200, true, 'Report status updated successfully', { report });
});

export const shareReportWithDoctor = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { doctorId } = req.body;

  const report = await LabService.shareReportWithDoctor(reportId, doctorId, req.user._id);
  sendResponse(res, 200, true, 'Report shared with doctor successfully', { report });
});

export const getLabStats = asyncHandler(async (req, res) => {
  const stats = await LabService.getLabStats(req.user._id);
  sendResponse(res, 200, true, 'Lab statistics retrieved successfully', { stats });
});

export const getLabAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const analytics = await LabService.getLabAnalytics(req.user._id, period);
  sendResponse(res, 200, true, 'Lab analytics retrieved successfully', { analytics });
});

export const performQualityControl = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const qualityData = req.body;

  const report = await LabService.performQualityControl(reportId, qualityData, req.user._id);
  sendResponse(res, 200, true, 'Quality control completed successfully', { report });
});

// Public routes for other modules
export const getAvailableLabs = asyncHandler(async (req, res) => {
  const { location, testType } = req.query;
  const labs = await LabService.getAvailableLabs(location, testType);
  sendResponse(res, 200, true, 'Available labs retrieved successfully', { labs });
});

export const createLabRequest = asyncHandler(async (req, res) => {
  const request = await LabService.createLabRequest(req.body);
  sendResponse(res, 201, true, 'Lab request created successfully', { request });
});

export const getLabRequests = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const requests = await LabService.getLabRequests(req.user._id, status);
  sendResponse(res, 200, true, 'Lab requests retrieved successfully', { requests });
});

export const getAllLabRequests = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const requests = await LabService.getAllLabRequests(status);
  sendResponse(res, 200, true, 'All lab requests retrieved successfully', { requests });
});

export const updateLabRequestStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status, notes } = req.body;
  
  const request = await LabService.updateLabRequestStatus(requestId, status, req.user._id, notes);
  sendResponse(res, 200, true, 'Lab request status updated successfully', { request });
});

export const assignLabToRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { labId } = req.body;

  const request = await LabService.assignLabToRequest(requestId, labId);
  sendResponse(res, 200, true, 'Lab assigned to request successfully', { request });
});

export const getPatientReports = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const labId = req.query.labId;

  const reports = await LabService.getPatientReports(patientId, labId);
  sendResponse(res, 200, true, 'Patient reports retrieved successfully', { reports });
});

export const getDoctorOrderedReports = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const labId = req.query.labId;

  const reports = await LabService.getDoctorOrderedReports(doctorId, labId);
  sendResponse(res, 200, true, 'Doctor ordered reports retrieved successfully', { reports });
});