import SystemLog from '../../admin/models/SystemLog.js';

export class AIDiagnosisService {
  constructor() {
    // In production, initialize with actual AI service
    this.modelVersion = '1.0.0';
    this.confidenceThreshold = 0.7;
  }

  async analyzeSymptoms(symptoms, patientAge, patientGender, medicalHistory = []) {
    try {
      // Mock AI analysis for development
      const analysis = this.mockAnalysis(symptoms, patientAge, patientGender, medicalHistory);
      
      // Log AI analysis request
      await SystemLog.createLog({
        level: 'info',
        category: 'ai',
        action: 'symptoms_analyzed',
        performedBy: {
          userType: 'system'
        },
        targetEntity: 'system',
        targetId: null,
        details: {
          symptoms,
          patientAge,
          patientGender,
          analysis: {
            condition: analysis.primaryCondition,
            confidence: analysis.confidence,
            riskLevel: analysis.riskLevel
          },
          modelVersion: this.modelVersion
        }
      });

      return analysis;
    } catch (error) {
      // Log AI analysis error
      await SystemLog.createLog({
        level: 'error',
        category: 'ai',
        action: 'analysis_failed',
        performedBy: {
          userType: 'system'
        },
        targetEntity: 'system',
        targetId: null,
        details: {
          error: error.message,
          symptoms,
          patientAge,
          patientGender
        }
      });

      throw new Error('AI analysis failed: ' + error.message);
    }
  }

  mockAnalysis(symptoms, patientAge, patientGender, medicalHistory) {
    const symptomText = symptoms.join(' ').toLowerCase();
    
    // Enhanced mock analysis with more detailed responses
    if (symptomText.includes('chest pain') || symptomText.includes('heart')) {
      return {
        primaryCondition: 'Possible Cardiac Event',
        confidence: 0.85,
        riskLevel: 'high',
        recommendations: [
          'Seek immediate medical attention',
          'ECG and cardiac enzymes recommended',
          'Avoid physical exertion',
          'Call emergency services if symptoms worsen'
        ],
        urgency: 'emergency',
        differentialDiagnoses: [
          { condition: 'Myocardial Infarction', probability: 0.4 },
          { condition: 'Angina Pectoris', probability: 0.3 },
          { condition: 'Anxiety Attack', probability: 0.15 },
          { condition: 'Gastroesophageal Reflux', probability: 0.15 }
        ],
        aiRemarks: 'High-risk cardiovascular symptoms detected. Age and gender factors considered.',
        followUpInstructions: 'Emergency department evaluation within 1 hour',
        redFlags: ['Chest pain', 'Potential cardiac event'],
        ageFactors: patientAge > 45 ? ['Increased cardiovascular risk due to age'] : [],
        genderFactors: patientGender === 'male' ? ['Higher cardiac risk in males'] : []
      };
    } else if (symptomText.includes('headache') || symptomText.includes('head')) {
      return {
        primaryCondition: 'Tension Headache',
        confidence: 0.75,
        riskLevel: 'medium',
        recommendations: [
          'Rest in a quiet, dark room',
          'Apply cold or warm compress',
          'Stay hydrated',
          'Consider over-the-counter pain relief',
          'Practice stress management techniques'
        ],
        urgency: 'routine',
        differentialDiagnoses: [
          { condition: 'Tension Headache', probability: 0.6 },
          { condition: 'Migraine', probability: 0.25 },
          { condition: 'Cluster Headache', probability: 0.1 },
          { condition: 'Sinus Headache', probability: 0.05 }
        ],
        aiRemarks: 'Common tension headache pattern. Stress and lifestyle factors likely contributors.',
        followUpInstructions: 'If symptoms persist beyond 48 hours or worsen, consult healthcare provider',
        redFlags: [],
        ageFactors: [],
        genderFactors: []
      };
    } else if (symptomText.includes('fever') || symptomText.includes('temperature')) {
      return {
        primaryCondition: 'Viral Upper Respiratory Infection',
        confidence: 0.70,
        riskLevel: 'medium',
        recommendations: [
          'Rest and adequate sleep',
          'Increase fluid intake',
          'Monitor temperature regularly',
          'Symptomatic treatment as needed',
          'Isolate to prevent spread'
        ],
        urgency: 'routine',
        differentialDiagnoses: [
          { condition: 'Viral Upper Respiratory Infection', probability: 0.5 },
          { condition: 'Bacterial Infection', probability: 0.3 },
          { condition: 'Influenza', probability: 0.15 },
          { condition: 'COVID-19', probability: 0.05 }
        ],
        aiRemarks: 'Typical viral infection pattern. Self-limiting condition expected.',
        followUpInstructions: 'Monitor for 3-5 days. Seek care if fever >101.5°F or symptoms worsen',
        redFlags: patientAge > 65 ? ['Age-related complications risk'] : [],
        ageFactors: patientAge > 65 ? ['Higher risk of complications in elderly'] : [],
        genderFactors: []
      };
    } else if (symptomText.includes('cough') || symptomText.includes('throat')) {
      return {
        primaryCondition: 'Upper Respiratory Tract Infection',
        confidence: 0.68,
        riskLevel: 'low',
        recommendations: [
          'Stay hydrated',
          'Use honey for throat soothing',
          'Humidify environment',
          'Avoid irritants like smoke',
          'Rest voice if sore throat present'
        ],
        urgency: 'routine',
        differentialDiagnoses: [
          { condition: 'Viral Upper Respiratory Infection', probability: 0.6 },
          { condition: 'Allergic Rhinitis', probability: 0.2 },
          { condition: 'Bacterial Pharyngitis', probability: 0.15 },
          { condition: 'Bronchitis', probability: 0.05 }
        ],
        aiRemarks: 'Common respiratory symptoms. Likely viral etiology.',
        followUpInstructions: 'If cough persists >2 weeks or produces blood, seek medical attention',
        redFlags: [],
        ageFactors: [],
        genderFactors: []
      };
    } else {
      return {
        primaryCondition: 'General Health Concern',
        confidence: 0.60,
        riskLevel: 'low',
        recommendations: [
          'Monitor symptoms closely',
          'Maintain healthy lifestyle',
          'Adequate rest and nutrition',
          'Consider healthcare consultation if symptoms persist',
          'Keep symptom diary for patterns'
        ],
        urgency: 'routine',
        differentialDiagnoses: [
          { condition: 'Stress-related symptoms', probability: 0.4 },
          { condition: 'Lifestyle factors', probability: 0.3 },
          { condition: 'Minor viral illness', probability: 0.2 },
          { condition: 'Nutritional deficiency', probability: 0.1 }
        ],
        aiRemarks: 'Non-specific symptoms. Multiple factors may be contributing.',
        followUpInstructions: 'Monitor symptoms and maintain healthy habits. Consult doctor if concerned.',
        redFlags: [],
        ageFactors: [],
        genderFactors: []
      };
    }
  }

  async getModelPerformanceMetrics() {
    try {
      // In production, this would query actual model performance data
      return {
        accuracy: 0.94,
        precision: 0.91,
        recall: 0.89,
        f1Score: 0.90,
        totalAnalyses: 15420,
        correctPredictions: 14495,
        doctorOverrideRate: 0.12,
        averageConfidence: 0.87,
        modelVersion: this.modelVersion,
        lastTrainingDate: new Date('2024-01-01'),
        lastUpdated: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  async saveAnalysisToHealthVault(patientId, analysis, doctorApproval = null) {
    try {
      // In production, this would save to the patient's health vault
      const healthVaultEntry = {
        type: 'ai_analysis',
        analysis,
        doctorApproval,
        timestamp: new Date(),
        patientId
      };

      await SystemLog.createLog({
        level: 'info',
        category: 'ai',
        action: 'analysis_saved_to_vault',
        performedBy: {
          userType: 'system'
        },
        targetEntity: 'user',
        targetId: patientId,
        details: {
          analysisId: healthVaultEntry.id,
          condition: analysis.primaryCondition,
          approved: !!doctorApproval
        }
      });
      
      return healthVaultEntry;
    } catch (error) {
      throw new Error('Failed to save analysis to health vault: ' + error.message);
    }
  }

  async getDoctorPendingReviews(doctorId) {
    try {
      // Mock pending reviews for doctor
      return [];
    } catch (error) {
      throw new Error('Failed to fetch pending reviews: ' + error.message);
    }
  }

  async submitDoctorReview(analysisId, doctorId, review) {
    try {
      await SystemLog.createLog({
        level: 'info',
        category: 'ai',
        action: 'doctor_review_submitted',
        performedBy: {
          userId: doctorId,
          userType: 'doctor'
        },
        targetEntity: 'system',
        targetId: analysisId,
        details: {
          review,
          analysisId
        }
      });
      
      return {
        analysisId,
        doctorReview: review,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error('Failed to submit doctor review: ' + error.message);
    }
  }
}

export const aiDiagnosisService = new AIDiagnosisService();