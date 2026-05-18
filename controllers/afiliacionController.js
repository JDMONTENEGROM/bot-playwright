import { afiliarTrabajador } from '../services/axaService.js';

export async function afiliarTrabajadorController(req, res) {
  try {
    const { trabajador } = req.body;

    if (!trabajador) {
      return res.status(400).json({ error: 'Trabajador is required' });
    }

    // Call the service to perform the affiliation
    const result = await afiliarTrabajador(trabajador);

    // Assuming the service returns an object with a success property
    if (result.success) {
      return res.json({ status: 'ok' });
    } else {
      return res.status(500).json({ error: 'Affiliation failed', details: result.error });
    }
  } catch (error) {
    console.error('Error in afiliarTrabajadorController:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}