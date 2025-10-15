import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medication name is required']
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  instructions: {
    type: String,
    default: ''
  },
  beforeFood: {
    type: Boolean,
    default: false
  }
});

const prescriptionSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  medications: [medicationSchema],
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required']
  },
  symptoms: {
    type: String,
    required: [true, 'Symptoms are required']
  },
  recommendations: {
    type: String,
    default: ''
  },
  followUpDate: {
    type: Date
  },
  labTestsRecommended: [{
    testName: String,
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'discontinued'],
    default: 'active'
  },
  digitalSignature: {
    type: String,
    default: ''
  },
  qrCode: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

export default mongoose.model('Prescription', prescriptionSchema);