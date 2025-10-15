import mongoose from 'mongoose';

const labRequestSchema = new mongoose.Schema({
  requestNumber: {
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
    ref: 'Doctor',
    required: true
  },
  lab: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lab'
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  testsRequested: [{
    testName: { type: String, required: true },
    testType: { type: String, required: true },
    urgency: { type: String, enum: ['Routine', 'Urgent', 'Emergency'], default: 'Routine' },
    instructions: String,
    fasting: { type: Boolean, default: false },
    estimatedCost: Number
  }],
  clinicalHistory: String,
  symptoms: String,
  provisionalDiagnosis: String,
  requestDate: {
    type: Date,
    default: Date.now
  },
  preferredCollectionDate: Date,
  sampleCollectionDate: Date,
  status: {
    type: String,
    enum: ['Requested', 'Lab Assigned', 'Sample Collected', 'Processing', 'Completed', 'Delivered'],
    default: 'Requested'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Emergency'],
    default: 'Medium'
  },
  sampleCollection: {
    method: { type: String, enum: ['Lab Visit', 'Home Collection', 'Hospital'], default: 'Lab Visit' },
    address: String,
    collectionDate: Date,
    collectedBy: String,
    sampleCondition: String
  },
  billing: {
    totalAmount: Number,
    discountApplied: Number,
    finalAmount: Number,
    paymentMethod: String,
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    transactionId: String
  },
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabReport'
  }],
  notes: String,
  cancelReason: String
}, {
  timestamps: true
});

// Generate unique request number
labRequestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const todayCount = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), day),
        $lt: new Date(year, date.getMonth(), day + 1)
      }
    });
    
    const sequence = (todayCount + 1).toString().padStart(4, '0');
    this.requestNumber = `REQ${year}${month}${day}${sequence}`;
  }
  next();
});

// Index for efficient queries
labRequestSchema.index({ patient: 1, requestDate: -1 });
labRequestSchema.index({ doctor: 1, requestDate: -1 });
labRequestSchema.index({ lab: 1, requestDate: -1 });
labRequestSchema.index({ status: 1 });
labRequestSchema.index({ priority: 1 });

export default mongoose.model('LabRequest', labRequestSchema);