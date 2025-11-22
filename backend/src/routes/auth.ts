
import { Router } from 'express';
import { loginAdmin, seedAdmin } from '../controllers/authController';

const router = Router();

router.post('/login', loginAdmin);
router.post('/seed', seedAdmin);

export default router;
