import path from 'node:path';
import { createStaticServer } from './static.js';

const root = path.resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT ?? 5173);
const host = '127.0.0.1';

const server = createStaticServer(root);

server.on('error', (err) => {
  const reason = err.code === 'EADDRINUSE' ? `Port ${port} is in use` : `Could not start on port ${process.env.PORT ?? port} (${err.code ?? err.message})`;
  console.error(`${reason}; set PORT to another port.`);
  process.exit(1);
});

try {
  server.listen(port, host, () => {
    console.log(`Noisemaker running at http://${host}:${port}/`);
  });
} catch (err) {
  server.emit('error', err);
}
