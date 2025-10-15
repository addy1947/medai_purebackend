import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['medical_license', 'degree_certificate', 'experience_certificate', 'identity_proof'],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationDate: Date,
  verificationNotes: String
});

const doctorApprovalSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    unique: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  documents: [documentSchema],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'additional_docs_required'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewStartDate: Date,
  reviewCompletionDate: Date,
  reviewComments: String,
  rejectionReason: String,
  additionalDocsRequired: [String],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvalDate: Date,
  verificationScore: {
    type: Number,
    min: 0,
    max: 100
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  medicalBoardVerification: {
    verified: { type: Boolean, default: false },
    verificationDate: Date,
    boardResponse: String
  },
  complianceChecks: {
    hipaaTraining: { type: Boolean, default: false },
    malpracticeInsurance: { type: Boolean, default: false },
    criminalBackground: { type: Boolean, default: false }
  },
  internalNotes: [String], // Admin-only notes
  communicationLog: [{
    type: { type: String, enum: ['email', 'phone', 'system'] },
    message: String,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    sentDate: { type: Date, default: Date.now },
    response: String,
    responseDate: Date
  }]
}, {
  timestamps: true
});

// Index for efficient queries
doctorApprovalSchema.index({ status: 1, submissionDate: 1 });
doctorApprovalSchema.index({ assignedTo: 1, status: 1 });
doctorApprovalSchema.index({ priority: 1, submissionDate: 1 });

export default mongoose.model('DoctorApproval', doctorApprovalSchema);