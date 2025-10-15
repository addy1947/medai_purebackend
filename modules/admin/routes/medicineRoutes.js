import express from 'express';
import {
  getAllMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  getMedicineCategories,
  getMedicineStats
} from '../controllers/medicineController.js';
import { authenticate, authorize } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/adminAuth.js';

const router = express.Router();

// Protected routes (require admin authentication)
router.use(authenticate);
router.use(authorize('admin', 'super-admin'));

// Medicine management
router.get('/', getAllMedicines);
router.post('/', requirePermission('manage_medicines'), addMedicine);
router.put('/:medicineId', requirePermission('manage_medicines'), updateMedicine);
router.delete('/:medicineId', requirePermission('manage_medicines'), deleteMedicine);

// Medicine analytics
router.get('/categories', getMedicineCategories);
router.get('/stats', getMedicineStats);

export default router;