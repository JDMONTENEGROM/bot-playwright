import express from 'express';
import { afiliarTrabajadorController } from '../controllers/afiliacionController.js';

const router = express.Router();

router.post('/', afiliarTrabajadorController);

export default router;