import { asyncHandler } from '../../../middlewares/errorHandler.js';
import { sendResponse, sendError } from '../../../utils/responseHelper.js';
import SystemLog from '../models/SystemLog.js';

// Mock medicine data store (in production, this would be a proper database)
let medicines = [
  {
    id: '1',
    name: 'Paracetamol',
    genericName: 'Acetaminophen',
    manufacturer: 'Generic Pharma',
    category: 'pain-relief',
    description: 'Pain reliever and fever reducer commonly used for headaches, muscle aches, and fever.',
    dosageForm: 'Tablet',
    strength: '500mg',
    price: 25.50,
    availability: true,
    prescriptionRequired: false,
    sideEffects: ['Nausea', 'Allergic reactions (rare)', 'Liver damage (with overdose)'],
    contraindications: ['Severe liver disease', 'Alcohol dependency'],
    uses: ['Headache', 'Fever', 'Muscle pain', 'Arthritis pain'],
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    manufacturer: 'Antibiotic Labs',
    category: 'antibiotics',
    description: 'Broad-spectrum antibiotic used to treat various bacterial infections.',
    dosageForm: 'Capsule',
    strength: '250mg',
    price: 89.99,
    availability: true,
    prescriptionRequired: true,
    sideEffects: ['Diarrhea', 'Nausea', 'Skin rash', 'Allergic reactions'],
    contraindications: ['Penicillin allergy', 'Severe kidney disease'],
    uses: ['Respiratory infections', 'Urinary tract infections', 'Skin infections', 'Dental infections'],
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const getAllMedicines = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    prescriptionRequired: req.query.prescriptionRequired,
    availability: req.query.availability,
    search: req.query.search
  };

  let filteredMedicines = medicines;

  if (filters.category && filters.category !== 'all') {
    filteredMedicines = filteredMedicines.filter(med => med.category === filters.category);
  }

  if (filters.prescriptionRequired !== undefined) {
    filteredMedicines = filteredMedicines.filter(med => 
      med.prescriptionRequired === (filters.prescriptionRequired === 'true')
    );
  }

  if (filters.availability !== undefined) {
    filteredMedicines = filteredMedicines.filter(med => 
      med.availability === (filters.availability === 'true')
    );
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredMedicines = filteredMedicines.filter(med =>
      med.name.toLowerCase().includes(searchTerm) ||
      med.genericName.toLowerCase().includes(searchTerm) ||
      med.manufacturer.toLowerCase().includes(searchTerm)
    );
  }

  sendResponse(res, 200, true, 'Medicines retrieved successfully', { medicines: filteredMedicines });
});

export const addMedicine = asyncHandler(async (req, res) => {
  const medicineData = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  medicines.push(medicineData);

  // Log medicine addition
  await SystemLog.createLog({
    level: 'info',
    category: 'system',
    action: 'medicine_added',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'medicine',
    targetId: medicineData.id,
    details: {
      medicineName: medicineData.name,
      category: medicineData.category,
      manufacturer: medicineData.manufacturer
    }
  }, req);

  sendResponse(res, 201, true, 'Medicine added successfully', { medicine: medicineData });
});

export const updateMedicine = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;
  const updateData = req.body;

  const medicineIndex = medicines.findIndex(med => med.id === medicineId);
  
  if (medicineIndex === -1) {
    return sendError(res, 404, 'Medicine not found');
  }

  const oldMedicine = { ...medicines[medicineIndex] };
  medicines[medicineIndex] = {
    ...medicines[medicineIndex],
    ...updateData,
    updatedAt: new Date()
  };

  // Log medicine update
  await SystemLog.createLog({
    level: 'info',
    category: 'system',
    action: 'medicine_updated',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'medicine',
    targetId: medicineId,
    details: {
      medicineName: medicines[medicineIndex].name,
      changes: updateData,
      previousData: oldMedicine
    }
  }, req);

  sendResponse(res, 200, true, 'Medicine updated successfully', { medicine: medicines[medicineIndex] });
});

export const deleteMedicine = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;

  const medicineIndex = medicines.findIndex(med => med.id === medicineId);
  
  if (medicineIndex === -1) {
    return sendError(res, 404, 'Medicine not found');
  }

  const deletedMedicine = medicines[medicineIndex];
  medicines.splice(medicineIndex, 1);

  // Log medicine deletion
  await SystemLog.createLog({
    level: 'warning',
    category: 'system',
    action: 'medicine_deleted',
    performedBy: {
      userId: req.user._id,
      userType: 'admin',
      email: req.user.email
    },
    targetEntity: 'medicine',
    targetId: medicineId,
    details: {
      deletedMedicine: {
        name: deletedMedicine.name,
        category: deletedMedicine.category,
        manufacturer: deletedMedicine.manufacturer
      }
    }
  }, req);

  sendResponse(res, 200, true, 'Medicine deleted successfully');
});

export const getMedicineCategories = asyncHandler(async (req, res) => {
  const categories = [...new Set(medicines.map(med => med.category))];
  sendResponse(res, 200, true, 'Medicine categories retrieved successfully', { categories });
});

export const getMedicineStats = asyncHandler(async (req, res) => {
  const stats = {
    total: medicines.length,
    available: medicines.filter(med => med.availability).length,
    prescriptionRequired: medicines.filter(med => med.prescriptionRequired).length,
    categories: [...new Set(medicines.map(med => med.category))].length,
    averagePrice: medicines.reduce((sum, med) => sum + med.price, 0) / medicines.length,
    byCategory: {}
  };

  // Group by category
  medicines.forEach(med => {
    if (!stats.byCategory[med.category]) {
      stats.byCategory[med.category] = 0;
    }
    stats.byCategory[med.category]++;
  });

  sendResponse(res, 200, true, 'Medicine statistics retrieved successfully', { stats });
});