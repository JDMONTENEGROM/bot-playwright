import express from 'express';
import afiliarRouter from './routes/afiliar.js';
import loginRouter from './routes/login.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/afiliar', afiliarRouter);
app.use('/login', loginRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});