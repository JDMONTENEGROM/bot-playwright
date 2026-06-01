import express from 'express';
import afiliarRouter from './routes/afiliar.js';
import { loginAutomatico } from './services/loginService.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/afiliar', afiliarRouter);

app.post('/login', async (req, res) => {
  try {
    const resultado = await loginAutomatico(req.body);
    res.json(resultado);
  } catch (error) {
    console.error('Error en /login:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});