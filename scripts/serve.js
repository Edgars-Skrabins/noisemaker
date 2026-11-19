import path from 'node:path';
import { createStaticServer } from './static.js';

const root = path.resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT) || 5173;
const host = 'localhost';

createStaticServer(root).listen(port, host, () => {
  console.log(`Noisemaker running at http://${host}:${port}/`);
});
