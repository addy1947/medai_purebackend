import Admin from '../models/Admin.js';
import { logger } from '../../../utils/logger.js';

export const createDefaultAdmin = async () => {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    
    if (existingAdmin) {
      logger.info('Admin account already exists');
      return;
    }

    // Create default super admin
    const defaultAdmin = new Admin({
      fullName: 'System Administrator',
      email: 'admin@medai.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      role: 'super-admin',
      permissions: [
        'manage_users',
        'manage_doctors',
        'manage_medicines',
        'approve_registrations',
        'view_analytics',
        'system_settings',
        'financial_reports',
        'audit_logs',
        'manage_admins'
      ],
      department: 'operations',
      isActive: true
    });

    await defaultAdmin.save();
    
    logger.info('Default admin account created successfully');
    logger.info('Email: admin@medai.com');
    logger.info('Password: admin123');
    logger.warn('Please change the default password immediately!');
    
  } catch (error) {
    logger.error('Error creating default admin:', error);
  }
};

export const seedAdminData = async () => {
  try {
    await createDefaultAdmin();
    
    // Create additional admin accounts for different departments
    const additionalAdmins = [
      {
        fullName: 'Medical Administrator',
        email: 'medical@medai.com',
        password: 'medical123',
        role: 'admin',
        permissions: ['manage_doctors', 'approve_registrations', 'view_analytics'],
        department: 'medical'
      },
      {
        fullName: 'Operations Manager',
        email: 'operations@medai.com',
        password: 'operations123',
        role: 'admin',
        permissions: ['manage_users', 'view_analytics', 'manage_medicines'],
        department: 'operations'
      }
    ];

    for (const adminData of additionalAdmins) {
      const existingAdmin = await Admin.findOne({ email: adminData.email });
      if (!existingAdmin) {
        const admin = new Admin(adminData);
        await admin.save();
        logger.info(`Created admin account: ${adminData.email}`);
      }
    }

  } catch (error) {
    logger.error('Error seeding admin data:', error);
  }
};