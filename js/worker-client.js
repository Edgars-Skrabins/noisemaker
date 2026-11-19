const WORKER_URL = new URL('./worker.js', import.meta.url);

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

export class NoiseWorker {
  constructor() {
    this.worker = new Worker(WORKER_URL, { type: 'module' });
    this.pending = new Map();
    this.nextId = 0;
    this.worker.onmessage = (e) => {
      const job = this.pending.get(e.data.id);
      if (!job) return;
      if (e.data.progress !== undefined) {
        if (job.onProgress) job.onProgress(e.data.progress);
        return;
      }
      this.pending.delete(e.data.id);
      job.resolve(e.data.data);
    };
    this.worker.onerror = (e) => {
      e.preventDefault();
      this.failAll(new Error(e.message || 'Noise worker failed'));
    };
  }

  run(w, h, p, onProgress) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({ id, w, h, p });
    });
  }

  failAll(err) {
    const jobs = [...this.pending.values()];
    this.pending.clear();
    jobs.forEach((job) => job.reject(err));
  }

  terminate() {
    this.worker.terminate();
    this.failAll(new CancelledError());
  }
}
