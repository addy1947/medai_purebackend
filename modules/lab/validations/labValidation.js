import Joi from 'joi';

export const validateLabRegistration = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character'
      }),
    licenseNumber: Joi.string().required(),
    registrationNumber: Joi.string().required(),
    accreditation: Joi.string().valid('NABL', 'CAP', 'ISO15189', 'Other').required(),
    contactInfo: Joi.object({
      phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
      alternatePhone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
      fax: Joi.string().optional(),
      website: Joi.string().uri().optional()
    }).required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().optional()
    }).required(),
    services: Joi.array().items(
      Joi.string().valid(
        'Blood Tests', 'Urine Tests', 'X-Ray', 'MRI', 'CT Scan', 
        'Ultrasound', 'ECG', 'Pathology', 'Microbiology', 
        'Biochemistry', 'Hematology', 'Immunology', 'Molecular Diagnostics'
      )
    ).min(1).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

export const validateLabLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

export const validateLabReportUpload = (req, res, next) => {
  const schema = Joi.object({
    patient: Joi.string().required(),
    testType: Joi.string().required(),
    testName: Joi.string().required(),
    sampleId: Joi.string().required(),
    collectionDate: Joi.date().required(),
    reportDate: Joi.date().optional(),
    results: Joi.array().items(
      Joi.object({
        parameter: Joi.string().required(),
        value: Joi.string().required(),
        unit: Joi.string().optional(),
        referenceRange: Joi.string().optional(),
        status: Joi.string().valid('Normal', 'Abnormal', 'Critical').optional()
      })
    ).optional(),
    technician: Joi.object({
      name: Joi.string().required(),
      id: Joi.string().required()
    }).optional(),
    pathologist: Joi.object({
      name: Joi.string().required(),
      id: Joi.string().required(),
      signature: Joi.string().optional()
    }).optional(),
    notes: Joi.string().optional(),
    priority: Joi.string().valid('Routine', 'Urgent', 'Emergency').optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

export const validateQualityControl = (req, res, next) => {
  const schema = Joi.object({
    reviewed: Joi.boolean().required(),
    reviewedBy: Joi.string().required(),
    qualityScore: Joi.number().min(0).max(100).required(),
    comments: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

export const validateLabRequest = (req, res, next) => {
  const schema = Joi.object({
    patient: Joi.string().required(),
    doctor: Joi.string().required(),
    lab: Joi.string().optional(),
    appointment: Joi.string().optional(),
    testsRequested: Joi.array().items(
      Joi.object({
        testName: Joi.string().required(),
        testType: Joi.string().required(),
        urgency: Joi.string().valid('Routine', 'Urgent', 'Emergency').optional(),
        instructions: Joi.string().optional(),
        fasting: Joi.boolean().optional(),
        estimatedCost: Joi.number().min(0).optional()
      })
    ).min(1).required(),
    clinicalHistory: Joi.string().optional(),
    symptoms: Joi.string().optional(),
    provisionalDiagnosis: Joi.string().optional(),
    preferredCollectionDate: Joi.date().optional(),
    sampleCollection: Joi.object({
      method: Joi.string().valid('Lab Visit', 'Home Collection', 'Hospital').optional(),
      address: Joi.string().optional()
    }).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};