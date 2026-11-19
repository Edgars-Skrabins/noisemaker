const WORKER_URL = new URL('./worker.js', import.meta.url);

export function createNoiseWorker() {
  return new Worker(WORKER_URL, { type: 'module' });
}

export function runWorker(worker, id, w, h, p, onProgress) {
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.id !== id) return;
      if (e.data.progress !== undefined) {
        if (onProgress) onProgress(e.data.progress);
        return;
      }
      resolve(e.data.data);
    };
    worker.onerror = (e) => reject(new Error(e.message || 'Noise worker failed'));
    worker.postMessage({ id, w, h, p });
  });
}
