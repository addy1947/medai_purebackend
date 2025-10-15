import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    required: true
  },
  category: {
    type: String,
    enum: ['auth', 'user_management', 'doctor_management', 'lab_management', 'system', 'security', 'api', 'database'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    userType: { type: String, enum: ['admin', 'doctor', 'user', 'system'] },
    email: String
  },
  targetEntity: {
    type: String,
    enum: ['user', 'doctor', 'admin', 'lab', 'appointment', 'prescription', 'medicine', 'system'],
    required: true
  },
  targetId: mongoose.Schema.Types.ObjectId,
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String,
    endpoint: String,
    method: String,
    responseTime: Number,
    statusCode: Number
  },
  tags: [String], // For categorization and filtering
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedDate: Date,
  resolutionNotes: String
}, {
  timestamps: true
});

// TTL index to automatically delete old logs after 1 year
systemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Indexes for efficient queries
systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ category: 1, createdAt: -1 });
systemLogSchema.index({ 'performedBy.userId': 1, createdAt: -1 });
systemLogSchema.index({ targetEntity: 1, targetId: 1 });
systemLogSchema.index({ resolved: 1, level: 1 });

// Static method to create log entry
systemLogSchema.statics.createLog = function(logData, req = null) {
  const metadata = {};
  
  if (req) {
    metadata.ipAddress = req.ip;
    metadata.userAgent = req.get('User-Agent');
    metadata.endpoint = req.originalUrl;
    metadata.method = req.method;
    metadata.sessionId = req.sessionID;
  }
  
  return this.create({
    ...logData,
    metadata: { ...metadata, ...logData.metadata }
  });
};

export default mongoose.model('SystemLog', systemLogSchema);