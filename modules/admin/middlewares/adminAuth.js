import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import SystemLog from '../models/SystemLog.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Admin authentication required.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify it's an admin token
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    const admin = await Admin.findById(decoded.id).select('-password -twoFactorSecret');
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin account not found.' 
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin account is suspended.' 
      });
    }

    if (admin.isLocked()) {
      return res.status(423).json({ 
        success: false, 
        message: 'Admin account is temporarily locked.' 
      });
    }

    req.user = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    
    // Log failed authentication attempt
    await SystemLog.createLog({
      level: 'warning',
      category: 'security',
      action: 'admin_auth_failed',
      performedBy: {
        userType: 'unknown'
      },
      targetEntity: 'system',
      targetId: null,
      details: {
        error: error.message,
        token: req.cookies.token ? 'present' : 'missing'
      }
    }, req);

    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired admin token.' 
    });
  }
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'super-admin') {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      // Log unauthorized access attempt
      SystemLog.createLog({
        level: 'warning',
        category: 'security',
        action: 'unauthorized_access_attempt',
        performedBy: {
          userId: req.user._id,
          userType: 'admin',
          email: req.user.email
        },
        targetEntity: 'system',
        targetId: req.user._id,
        details: {
          requiredPermission: permission,
          userPermissions: req.user.permissions,
          endpoint: req.originalUrl
        }
      }, req);

      return res.status(403).json({ 
        success: false, 
        message: `Insufficient permissions. Required: ${permission}` 
      });
    }

    next();
  };
};

export const logAdminAction = (action, targetEntity) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log successful admin action
      if (data.success) {
        SystemLog.createLog({
          level: 'info',
          category: 'admin_action',
          action,
          performedBy: {
            userId: req.user._id,
            userType: 'admin',
            email: req.user.email
          },
          targetEntity,
          targetId: req.params.userId || req.params.doctorId || req.user._id,
          details: {
            requestBody: req.body,
            responseData: data.data
          }
        }, req);
      }
      
      // Call original json method
      originalJson.call(this, data);
    };
    
    next();
  };
};

export const rateLimitAdmin = (windowMs = 15 * 60 * 1000, max = 100) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.user?._id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }
    
    const userAttempts = attempts.get(key);
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => time > windowStart);
    attempts.set(key, recentAttempts);
    
    if (recentAttempts.length >= max) {
      // Log rate limit violation
      SystemLog.createLog({
        level: 'warning',
        category: 'security',
        action: 'rate_limit_exceeded',
        performedBy: {
          userId: req.user?._id,
          userType: 'admin'
        },
        targetEntity: 'system',
        targetId: req.user?._id,
        details: {
          endpoint: req.originalUrl,
          attemptCount: recentAttempts.length,
          windowMs,
          maxAttempts: max
        }
      }, req);

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    recentAttempts.push(now);
    next();
  };
};