import fs from 'fs';
import data from './empleado.json' assert { type: 'json' };

const buffer = Buffer.from(data.documentoIdentidad, 'base64');
fs.writeFileSync('documento.pdf', buffer);
console.log('Guardado como documento.pdf');
