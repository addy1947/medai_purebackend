import { UserService } from '../services/userService.js';
import { asyncHandler } from '../../../middlewares/errorHandler.js';

export const registerUser = asyncHandler(async (req, res) => {
  const user = await UserService.createUser(req.body);
  const token = UserService.generateToken(user._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user, token }
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await UserService.authenticateUser(email, password);
  const token = UserService.generateToken(user._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token }
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { user }
  });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const updatedUser = await UserService.updateUser(req.user._id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
});

export const getMedicalHistory = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { medicalHistory: user.medicalHistory }
  });
});

export const addMedicalHistory = asyncHandler(async (req, res) => {
  const medicalRecord = await UserService.addMedicalHistory(req.user._id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Medical history added successfully',
    data: { medicalRecord }
  });
});

export const getPrescriptions = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { prescriptions: user.prescriptions }
  });
});

export const addPrescription = asyncHandler(async (req, res) => {
  const prescription = await UserService.addPrescription(req.user._id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Prescription added successfully',
    data: { prescription }
  });
});

export const getLabReports = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { labReports: user.labReports }
  });
});

export const addLabReport = asyncHandler(async (req, res) => {
  const labReport = await UserService.addLabReport(req.user._id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Lab report added successfully',
    data: { labReport }
  });
});

export const getInsuranceDetails = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { insurance: user.insurance }
  });
});

export const updateInsurance = asyncHandler(async (req, res) => {
  const insurance = await UserService.updateInsurance(req.user._id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Insurance details updated successfully',
    data: { insurance }
  });
});

// Scanned Documents endpoints
export const getScannedDocuments = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: { scannedDocuments: user.scannedDocuments }
  });
});

export const addScannedDocument = asyncHandler(async (req, res) => {
  const scannedDocument = await UserService.addScannedDocument(req.user._id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Scanned document saved successfully',
    data: { scannedDocument }
  });
});

export const deleteScannedDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  await UserService.deleteScannedDocument(req.user._id, documentId);
  
  res.status(200).json({
    success: true,
    message: 'Scanned document deleted successfully'
  });
});