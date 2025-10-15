import fs from 'fs';
import path from 'path';

export class LabHelper {
  static generateReportNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `LAB${year}${month}${day}${timestamp}`;
  }

  static validateFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.dcm'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    return allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);
  }

  static calculateTurnaroundTime(sampleCollectionDate, deliveryDate) {
    if (!sampleCollectionDate || !deliveryDate) return null;
    
    const timeDiff = new Date(deliveryDate) - new Date(sampleCollectionDate);
    return Math.round(timeDiff / (1000 * 60 * 60)); // Return hours
  }

  static parseTestResults(ocrText) {
    // Mock OCR parsing logic
    const results = {
      keyFindings: [],
      abnormalValues: [],
      criticalValues: []
    };

    // Simple pattern matching for common lab values
    const patterns = {
      hemoglobin: /hemoglobin[:\s]*(\d+\.?\d*)/i,
      glucose: /glucose[:\s]*(\d+\.?\d*)/i,
      cholesterol: /cholesterol[:\s]*(\d+\.?\d*)/i,
      creatinine: /creatinine[:\s]*(\d+\.?\d*)/i
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = ocrText.match(pattern);
      if (match) {
        results.keyFindings.push(`${key}: ${match[1]}`);
        
        // Check for abnormal values (simplified logic)
        const value = parseFloat(match[1]);
        if (key === 'glucose' && (value < 70 || value > 140)) {
          results.abnormalValues.push(`${key}: ${value} (abnormal)`);
        }
        if (key === 'hemoglobin' && (value < 12 || value > 16)) {
          results.abnormalValues.push(`${key}: ${value} (abnormal)`);
        }
      }
    });

    return results;
  }

  static generateAIAnalysis(testParameters, testType) {
    const analysis = {
      keyFindings: [],
      riskLevel: 'Low',
      recommendations: [],
      abnormalFlags: []
    };

    if (!testParameters || testParameters.length === 0) {
      return analysis;
    }

    // Analyze test parameters
    testParameters.forEach(param => {
      if (param.isAbnormal) {
        analysis.abnormalFlags.push(`${param.parameter}: ${param.value} ${param.unit}`);
        
        if (param.flagType === 'Critical') {
          analysis.riskLevel = 'High';
          analysis.recommendations.push(`Immediate attention required for ${param.parameter}`);
        } else if (param.flagType === 'High' || param.flagType === 'Low') {
          if (analysis.riskLevel === 'Low') analysis.riskLevel = 'Medium';
          analysis.recommendations.push(`Monitor ${param.parameter} levels`);
        }
      } else {
        analysis.keyFindings.push(`${param.parameter}: Normal`);
      }
    });

    // Add general recommendations based on test type
    if (testType === 'Blood Test') {
      analysis.recommendations.push('Maintain regular health checkups');
      analysis.recommendations.push('Follow prescribed medications if any');
    }

    if (analysis.abnormalFlags.length === 0) {
      analysis.recommendations = ['All parameters within normal range', 'Continue healthy lifestyle'];
    }

    return analysis;
  }

  static formatReportForHealthVault(labReport) {
    return {
      _id: labReport._id,
      testName: labReport.testName,
      testType: labReport.testType,
      reportDate: labReport.reportDate,
      results: labReport.results.summary,
      normalRange: labReport.results.normalValues,
      labName: labReport.lab?.name || 'Lab',
      doctorReferred: labReport.doctor ? 'Doctor' : '',
      fileUrl: labReport.files[0]?.fileUrl || '',
      status: 'completed'
    };
  }

  static calculateQualityScore(report) {
    let score = 100;
    
    // Deduct points for missing information
    if (!report.results.summary) score -= 20;
    if (!report.results.interpretation) score -= 15;
    if (!report.pathologist.signature) score -= 10;
    if (!report.technician.signature) score -= 10;
    
    // Deduct points for delayed delivery
    if (report.expectedDeliveryDate && report.actualDeliveryDate) {
      const delay = report.actualDeliveryDate - report.expectedDeliveryDate;
      const delayHours = delay / (1000 * 60 * 60);
      if (delayHours > 24) score -= 20;
      else if (delayHours > 12) score -= 10;
      else if (delayHours > 6) score -= 5;
    }

    return Math.max(0, score);
  }

  static ensureUploadDirectory() {
    const uploadDir = path.join(process.cwd(), 'uploads', 'lab-reports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  static getTestTypeCategories() {
    return {
      'Blood Tests': ['CBC', 'Lipid Profile', 'Liver Function', 'Kidney Function', 'Thyroid Function'],
      'Urine Tests': ['Routine Urine', 'Urine Culture', 'Protein in Urine'],
      'Imaging': ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound'],
      'Cardiac': ['ECG', 'Echo', 'Stress Test'],
      'Pathology': ['Biopsy', 'Cytology', 'Histopathology'],
      'Microbiology': ['Blood Culture', 'Stool Culture', 'Throat Swab'],
      'Specialized': ['Molecular Diagnostics', 'Genetic Testing', 'Immunology']
    };
  }

  static getNormalRanges() {
    return {
      'Hemoglobin': { min: 12, max: 16, unit: 'g/dL' },
      'WBC Count': { min: 4000, max: 11000, unit: '/μL' },
      'Platelet Count': { min: 150000, max: 450000, unit: '/μL' },
      'Glucose (Fasting)': { min: 70, max: 100, unit: 'mg/dL' },
      'Total Cholesterol': { min: 0, max: 200, unit: 'mg/dL' },
      'Creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL' },
      'ALT': { min: 7, max: 56, unit: 'U/L' },
      'AST': { min: 10, max: 40, unit: 'U/L' }
    };
  }

  static checkAbnormalValues(parameter, value, unit) {
    const normalRanges = this.getNormalRanges();
    const range = normalRanges[parameter];
    
    if (!range || range.unit !== unit) {
      return { isAbnormal: false, flagType: 'Normal' };
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      return { isAbnormal: false, flagType: 'Normal' };
    }

    if (numericValue < range.min) {
      return { 
        isAbnormal: true, 
        flagType: numericValue < range.min * 0.5 ? 'Critical' : 'Low' 
      };
    }
    
    if (numericValue > range.max) {
      return { 
        isAbnormal: true, 
        flagType: numericValue > range.max * 2 ? 'Critical' : 'High' 
      };
    }

    return { isAbnormal: false, flagType: 'Normal' };
  }

  static generateReportSummary(testParameters, testType) {
    if (!testParameters || testParameters.length === 0) {
      return `${testType} completed. Detailed results available in the report.`;
    }

    const abnormalParams = testParameters.filter(p => p.isAbnormal);
    const criticalParams = testParameters.filter(p => p.flagType === 'Critical');

    if (criticalParams.length > 0) {
      return `${testType} shows critical abnormalities in: ${criticalParams.map(p => p.parameter).join(', ')}. Immediate medical attention recommended.`;
    }

    if (abnormalParams.length > 0) {
      return `${testType} shows abnormal values in: ${abnormalParams.map(p => p.parameter).join(', ')}. Please consult your doctor.`;
    }

    return `${testType} completed. All parameters within normal range.`;
  }
}