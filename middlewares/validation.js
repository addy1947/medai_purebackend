import Joi from 'joi';

export const validateUserRegistration = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character'
      }),
    age: Joi.number().min(1).max(120).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    healthId: Joi.string().optional(),
    emergencyContact: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
      relationship: Joi.string().required()
    }).required()
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

export const validateUserLogin = (req, res, next) => {
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

export const validateProfileUpdate = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string().min(2).max(50),
    age: Joi.number().min(1).max(120),
    gender: Joi.string().valid('male', 'female', 'other'),
    phone: Joi.string().pattern(/^[0-9]{10}$/),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string(),
      country: Joi.string()
    }),
    emergencyContact: Joi.object({
      name: Joi.string(),
      phone: Joi.string().pattern(/^[0-9]{10}$/),
      relationship: Joi.string()
    })
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

export const validateDoctorRegistration = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character'
      }),
    specialization: Joi.string().required(),
    licenseNumber: Joi.string().required(),
    experience: Joi.number().min(0).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    consultationFee: Joi.number().min(0).required(),
    qualifications: Joi.array().items(
      Joi.object({
        degree: Joi.string().required(),
        institution: Joi.string().required(),
        year: Joi.number().required()
      })
    ).optional()
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

export const validateDoctorLogin = (req, res, next) => {
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

export const validatePrescription = (req, res, next) => {
  const schema = Joi.object({
    patient: Joi.string().required(),
    appointment: Joi.string().optional(),
    medications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        dosage: Joi.string().required(),
        frequency: Joi.string().required(),
        duration: Joi.string().required(),
        instructions: Joi.string().optional(),
        beforeFood: Joi.boolean().optional()
      })
    ).required(),
    diagnosis: Joi.string().required(),
    symptoms: Joi.string().required(),
    recommendations: Joi.string().optional(),
    followUpDate: Joi.date().optional(),
    labTestsRecommended: Joi.array().items(
      Joi.object({
        testName: Joi.string().required(),
        urgency: Joi.string().valid('low', 'medium', 'high').optional()
      })
    ).optional()
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

export const validateAdminLogin = (req, res, next) => {
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
      website: Joi.string().uri().optional()
    }).required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required()
    }).required(),
    services: Joi.array().items(Joi.string()).min(1).required()
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

export const validateAppointmentBooking = (req, res, next) => {
  const schema = Joi.object({
    doctor: Joi.string().required(),
    appointmentDate: Joi.date().required(),
    consultationFee:Joi.number().required(),
    timeSlot: Joi.object({
      start: Joi.string().required(),
      end: Joi.string().required()
    }).required(),
    type: Joi.string().valid('consultation', 'follow-up', 'emergency', 'routine-checkup').optional(),
    symptoms: Joi.string().required()
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