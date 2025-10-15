import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  street: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zipCode: { type: String, default: '' },
  country: { type: String, default: 'India' }
});

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relationship: { type: String, required: true }
});

const medicalHistorySchema = new mongoose.Schema({
  condition: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String, default: '' },
  medications: [{ type: String }],
  doctorName: { type: String, default: '' },
  hospitalName: { type: String, default: '' },
  dateRecorded: { type: Date, default: Date.now },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  notes: { type: String, default: '' }
});

const prescriptionSchema = new mongoose.Schema({
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  prescribedBy: { type: String, required: true },
  prescribedDate: { type: Date, default: Date.now },
  instructions: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
});

const labReportSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  testType: { type: String, required: true },
  reportDate: { type: Date, default: Date.now },
  results: { type: String, default: '' },
  normalRange: { type: String, default: '' },
  labName: { type: String, default: '' },
  doctorReferred: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'reviewed'], default: 'completed' }
});

const insuranceSchema = new mongoose.Schema({
  provider: { type: String, default: '' },
  policyNumber: { type: String, default: '' },
  groupNumber: { type: String, default: '' },
  validUntil: { type: Date },
  coverageAmount: { type: Number, default: 0 },
  deductible: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false }
});

const scannedDocumentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['medical-history', 'prescription', 'lab-report', 'other']
  },
  extractedText: { type: String, required: true },
  aiAnalysis: {
    patientName: { type: String, default: '' },
    doctorName: { type: String, default: '' },
    date: { type: Date },
    medications: [{ 
      name: String, 
      dosage: String, 
      frequency: String 
    }],
    testResults: [{ 
      testName: String, 
      value: String, 
      normalRange: String 
    }],
    diagnosis: { type: String, default: '' },
    labName: { type: String, default: '' }
  },
  originalFileUrl: { type: String, default: '' },
  uploadDate: { type: Date, default: Date.now },
  isProcessed: { type: Boolean, default: true },
  confidence: { type: Number, default: 0 } 
});

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxLength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters']
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'lab', 'insurance', 'admin', 'manager'],
    default: 'patient'
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  healthId: {
    type: String,
    unique: true,
    sparse: true
  },
  address: addressSchema,
  emergencyContact: emergencyContactSchema,
  medicalHistory: [medicalHistorySchema],
  prescriptions: [prescriptionSchema],
  labReports: [labReportSchema],
  insurance: insuranceSchema,
  scannedDocuments: [scannedDocumentSchema],
  profilePicture: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);