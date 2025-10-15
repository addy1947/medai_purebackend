import jwt from 'jsonwebtoken';
import User from '../modules/user/models/User.js';
import Doctor from '../modules/doctor/models/Doctor.js';
import Admin from '../modules/admin/models/Admin.js';
import Lab from '../modules/lab/models/Lab.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    
    // Check user type based on role in token or find in appropriate collection
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password -twoFactorSecret');
    } else if (decoded.role === 'doctor') {
      user = await Doctor.findById(decoded.id).select('-password');
    } else if (decoded.role === 'lab') {
      user = await Lab.findById(decoded.id).select('-password');
    } else {
      user = await User.findById(decoded.id).select('-password');
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is suspended.' 
      });
    }
    req.user = user;
    // Additional check for lab approval
    if (decoded.role === 'lab' && !user.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Lab account is pending approval.' 
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid.' 
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. User not authenticated.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};