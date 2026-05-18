import express from 'express';
import { loginAutomatico } from '../services/loginService.js';

const router = express.Router();

router.post('/', async (req, res) => {

  const result = await loginAutomatico(req.body);

  res.json(result);

});

export default router;