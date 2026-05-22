import express from 'express';
import afiliarRouter from './routes/afiliar.js';
import { loginAutomatico } from './services/loginService.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/afiliar', afiliarRouter);

app.post('/login', async (req, res) => {
  const {
    email, password, cedula, primerNombre, segundoNombre,
    primerApellido, segundoApellido, fechaNacimiento, genero, estadoCivil,
    departamento, ciudad, direccion, telefono, celular, correo,
    fechaIngreso, tipoSalario, salarioBasico, cargo, empresaEnMision,
    sucursal, centroTrabajo, tasaRiesgo, administradoraEPS, administradoraAFP,
    tipoAfiliado, grupoOcupacion, tipoOcupacion, modalidadTrabajo,
    tareasAltoRiesgo, jornadaCompleta
  } = req.body;

  const result = await loginAutomatico(req.body);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});