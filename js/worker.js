import { generate } from './noise.js';

self.onmessage = (e) => {
  const { id, w, h, p } = e.data;
  const data = generate(w, h, p, (progress) => self.postMessage({ id, progress }));
  self.postMessage({ id, data }, [data.buffer]);
};
