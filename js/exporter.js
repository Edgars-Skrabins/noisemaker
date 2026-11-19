import { encodeBMP, encodeTGA, encodeR16, mimeFor } from './encoders.js';

export function canvasBlob(rgba, w, h, type, quality) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
  return new Promise((resolve, reject) => {
    c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), type, quality);
  });
}

export async function encode(format, out, size, quality) {
  const type = mimeFor(format);
  if (format === 'bmp') return new Blob([encodeBMP(out.rgba, size, size)], { type });
  if (format === 'tga') return new Blob([encodeTGA(out.rgba, size, size)], { type });
  if (format === 'r16') return new Blob([encodeR16(out.height)], { type });
  return canvasBlob(out.rgba, size, size, type, quality);
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
