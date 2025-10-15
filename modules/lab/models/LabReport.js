import mongoose from 'mongoose';

const labReportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    required: true,
    unique: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  lab: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lab',
    required: true
  },
  testType: {
    type: String,
    required: [true, 'Test type is required'],
    enum: [
      'Blood Test',
      'Urine Test',
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
      'Molecular Diagnostics',
      'Other'
    ]
  },
  testName: {
    type: String,
    required: [true, 'Test name is required']
  },
  testCategory: {
    type: String,
    enum: ['Routine', 'Emergency', 'Specialized', 'Screening'],
    default: 'Routine'
  },
  sampleCollectionDate: {
    type: Date,
    required: true
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Sample Collected', 'Processing', 'Completed', 'Delivered', 'Reviewed'],
    default: 'Sample Collected'
  },
  files: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadDate: { type: Date, default: Date.now }
  }],
  results: {
    summary: String,
    findings: String,
    normalValues: String,
    abnormalValues: String,
    interpretation: String,
    recommendations: String
  },
  testParameters: [{
    parameter: String,
    value: String,
    unit: String,
    normalRange: String,
    isAbnormal: { type: Boolean, default: false },
    flagType: { type: String, enum: ['High', 'Low', 'Critical', 'Normal'], default: 'Normal' }
  }],
  ocrData: {
    extractedText: String,
    confidence: Number,
    processedDate: Date,
    aiAnalysis: {
      keyFindings: [String],
      riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
      recommendations: [String]
    }
  },
  technician: {
    name: String,
    id: String,
    signature: String
  },
  pathologist: {
    name: String,
    licenseNumber: String,
    signature: String,
    verificationDate: Date
  },
  qualityControl: {
    reviewed: { type: Boolean, default: false },
    reviewedBy: String,
    reviewDate: Date,
    qualityScore: Number,
    comments: String
  },
  billing: {
    totalAmount: Number,
    paidAmount: Number,
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Partial'], default: 'Pending' },
    insuranceClaimed: { type: Boolean, default: false }
  },
  sharing: {
    sharedWithPatient: { type: Boolean, default: false },
    sharedWithDoctor: { type: Boolean, default: false },
    patientAccessDate: Date,
    doctorAccessDate: Date,
    accessPermissions: {
      patient: { type: Boolean, default: true },
      doctor: { type: Boolean, default: false },
      admin: { type: Boolean, default: true }
    }
  },
  notifications: {
    patientNotified: { type: Boolean, default: false },
    doctorNotified: { type: Boolean, default: false },
    notificationDate: Date
  },
  metadata: {
    deviceUsed: String,
    softwareVersion: String,
    calibrationStatus: String,
    batchNumber: String
  }
}, {
  timestamps: true
});

// Generate unique report number
labReportSchema.pre('save', async function(next) {
  if (this.isNew && !this.reportNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Count reports for today to generate sequence
    const todayCount = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), day),
        $lt: new Date(year, date.getMonth(), day + 1)
      }
    });
    
    const sequence = (todayCount + 1).toString().padStart(4, '0');
    this.reportNumber = `LAB${year}${month}${day}${sequence}`;
  }
  next();
});

// Index for efficient queries
labReportSchema.index({ patient: 1, reportDate: -1 });
labReportSchema.index({ doctor: 1, reportDate: -1 });
labReportSchema.index({ lab: 1, reportDate: -1 });
labReportSchema.index({ status: 1 });
labReportSchema.index({ testType: 1 });

export default mongoose.model('LabReport', labReportSchema);