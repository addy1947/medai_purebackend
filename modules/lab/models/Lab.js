import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const labSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lab name is required'],
    trim: true,
    maxLength: [100, 'Lab name cannot be more than 100 characters']
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
    default: 'lab'
  },
  licenseNumber: {
    type: String,
    required: [true, 'Lab license number is required'],
    unique: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true
  },
  accreditation: {
    type: String,
    enum: ['NABL', 'CAP', 'ISO15189', 'Other'],
    required: [true, 'Accreditation is required']
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    alternatePhone: String,
    fax: String,
    website: String
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  operatingHours: {
    monday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    thursday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    friday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    saturday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    sunday: { start: String, end: String, isOpen: { type: Boolean, default: false } }
  },
  services: [{
    type: String,
    enum: [
      'Blood Tests',
      'Urine Tests', 
      'X-Ray',
      'MRI',
      'CT Scan',
      'Ultrasound',
      'ECG',
      'Pathology',
      'Microbiology',
      'Biochemistry',
      'Hematology',
      'Immunology',
      'Molecular Diagnostics'
    ]
  }],
  equipment: [{
    name: String,
    model: String,
    manufacturer: String,
    calibrationDate: Date,
    nextCalibrationDue: Date
  }],
  staff: [{
    name: String,
    qualification: String,
    role: String,
    licenseNumber: String
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvalDate: Date,
  rejectionReason: String,
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  totalReports: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'basic'
  },
  subscriptionExpiry: Date,
  profilePicture: String,
  documents: [{
    type: {
      type: String,
      enum: ['license', 'accreditation', 'registration', 'insurance']
    },
    url: String,
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    verificationDate: Date
  }],
  qualityMetrics: {
    averageTurnaroundTime: { type: Number, default: 0 }, // in hours
    reportAccuracy: { type: Number, default: 0 }, // percentage
    patientSatisfaction: { type: Number, default: 0 }, // rating
    onTimeDelivery: { type: Number, default: 0 } // percentage
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
labSchema.pre('save', async function(next) {
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
labSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
labSchema.methods.toJSON = function() {
  const lab = this.toObject();
  delete lab.password;
  return lab;
};

export default mongoose.model('Lab', labSchema);