import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const doctorSchema = new mongoose.Schema({
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
    default: 'doctor'
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'General Medicine',
      'Cardiology',
      'Dermatology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'Psychiatry',
      'Radiology',
      'Surgery',
      'Gynecology',
      'Ophthalmology',
      'ENT',
      'Oncology',
      'Endocrinology',
      'Gastroenterology'
    ]
  },
  licenseNumber: {
    type: String,
    required: [true, 'Medical license number is required'],
    unique: true
  },
  experience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  clinicDetails: {
    name: String,
    address: String,
    phone: String,
    timings: {
      start: String,
      end: String,
      days: [String]
    }
  },
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  isVerified: {
    type: Boolean,
    default: false
  }, 
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    average: { type: Number, default: 3 },
    count: { type: Number, default: 3 }
  },
  totalPatients: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'basic'
  },
  subscriptionExpiry: {
    type: Date
  },
  profilePicture: {
    type: String,
    default: ''
  },
  documents: [{
    type: String,
    url: String,
    verified: { type: Boolean, default: false }
  }],
  availability: {
    monday: { start: String, end: String, available: Boolean },
    tuesday: { start: String, end: String, available: Boolean },
    wednesday: { start: String, end: String, available: Boolean },
    thursday: { start: String, end: String, available: Boolean },
    friday: { start: String, end: String, available: Boolean },
    saturday: { start: String, end: String, available: Boolean },
    sunday: { start: String, end: String, available: Boolean }
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Create approval workflow when doctor is created
doctorSchema.post('save', async function(doc) {
  if (this.isNew) {
    try {
      const { DoctorApprovalWorkflow } = await import('../../admin/utils/doctorApprovalWorkflow.js');
      await DoctorApprovalWorkflow.initiateDoctorApproval(doc._id);
    } catch (error) {
      console.error('Error initiating doctor approval workflow:', error);
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
doctorSchema.pre('save', async function(next) {
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
doctorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
doctorSchema.methods.toJSON = function() {
  const doctor = this.toObject();
  delete doctor.password;
  return doctor;
};

export default mongoose.model('Doctor', doctorSchema);