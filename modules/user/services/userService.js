import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export class UserService {
  static generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
  }

  static async createUser(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const user = new User(userData);
      await user.save();
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async authenticateUser(email, password) {
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async addMedicalHistory(userId, medicalData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.medicalHistory.push(medicalData);
      await user.save();
      
      return user.medicalHistory[user.medicalHistory.length - 1];
    } catch (error) {
      throw error;
    }
  }

  static async addPrescription(userId, prescriptionData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.prescriptions.push(prescriptionData);
      await user.save();
      
      return user.prescriptions[user.prescriptions.length - 1];
    } catch (error) {
      throw error;
    }
  }

  static async addLabReport(userId, labReportData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.labReports.push(labReportData);
      await user.save();
      
      return user.labReports[user.labReports.length - 1];
    } catch (error) {
      throw error;
    }
  }

  static async updateInsurance(userId, insuranceData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { insurance: insuranceData },
        { new: true, runValidators: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.insurance;
    } catch (error) {
      throw error;
    }
  }

  static async addScannedDocument(userId, documentData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.scannedDocuments.push(documentData);
      await user.save();
      
      return user.scannedDocuments[user.scannedDocuments.length - 1];
    } catch (error) {
      throw error;
    }
  }

  static async deleteScannedDocument(userId, documentId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const documentIndex = user.scannedDocuments.findIndex(
        doc => doc._id.toString() === documentId
      );
      
      if (documentIndex === -1) {
        throw new Error('Scanned document not found');
      }

      user.scannedDocuments.splice(documentIndex, 1);
      await user.save();
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}