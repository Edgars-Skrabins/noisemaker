import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contentType, resolvePath, createStaticServer } from '../scripts/static.js';

const root = path.resolve(import.meta.dirname, '..');

function request(port, rawPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function startServer(t, serveRoot) {
  const server = createStaticServer(serveRoot);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return server.address().port;
}

test('contentType maps the served file types', () => {
  assert.equal(contentType('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentType('js/worker.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentType('css/style.css'), 'text/css; charset=utf-8');
  assert.equal(contentType('a.json'), 'application/json; charset=utf-8');
  assert.equal(contentType('a.svg'), 'image/svg+xml');
  assert.equal(contentType('a.png'), 'image/png');
  assert.equal(contentType('a.JPG'), 'image/jpeg');
  assert.equal(contentType('a.webp'), 'image/webp');
  assert.equal(contentType('favicon.ico'), 'image/x-icon');
  assert.equal(contentType('a.woff2'), 'font/woff2');
  assert.equal(contentType('a.txt'), 'text/plain; charset=utf-8');
  assert.equal(contentType('a.unknown'), 'application/octet-stream');
  assert.equal(contentType('Makefile'), 'application/octet-stream');
});

test('resolvePath maps URLs to files inside the root', () => {
  assert.equal(resolvePath(root, '/'), path.join(root, 'index.html'));
  assert.equal(resolvePath(root, '/js/app.js?v=1#x'), path.join(root, 'js', 'app.js'));
  assert.equal(resolvePath(root, '/my%20file.txt'), path.join(root, 'my file.txt'));
  assert.equal(resolvePath(root, '/css/'), path.join(root, 'css', 'index.html'));
});

test('resolvePath never escapes the root', () => {
  for (const url of [
    '/../package.json',
    '/../../etc/passwd',
    '/js/../../secret',
    '/%2e%2e/secret',
    '/%2e%2e%2fsecret',
    '/js/%2e%2e/%2e%2e/secret',
    '/..%5csecret',
    '/js%5c..%5c..%5csecret',
    '/%00',
    '/%E0%A4%A',
    '/.git/config',
    '/.claude/settings.json',
  ]) {
    const resolved = resolvePath(root, url);
    assert.ok(resolved === null || resolved.startsWith(root + path.sep), url);
    assert.ok(resolved === null || !resolved.includes(`${path.sep}.`), url);
  }
  assert.equal(resolvePath(root, '/%2e%2e/secret'), null);
  assert.equal(resolvePath(root, '/.git/config'), null);
});

test('the server serves the app with correct types and 404s the rest', async (t) => {
  const port = await startServer(t, root);

  const index = await request(port, '/');
  assert.equal(index.status, 200);
  assert.equal(index.headers['content-type'], 'text/html; charset=utf-8');
  assert.match(index.body, /<html/i);

  const worker = await request(port, '/js/worker.js');
  assert.equal(worker.status, 200);
  assert.equal(worker.headers['content-type'], 'text/javascript; charset=utf-8');

  const head = await request(port, '/js/worker.js', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(head.headers['content-length'], String(Buffer.byteLength(worker.body)));
  assert.equal(head.body, '');

  for (const url of ['/missing.html', '/js/', '/.git/HEAD', '/../package.json', '/%2e%2e/package.json', '/js/..%2f..%2fpackage.json']) {
    assert.equal((await request(port, url)).status, 404, url);
  }

  assert.equal((await request(port, '/', 'POST')).status, 405);
});

test('the server redirects folders without a trailing slash', async (t) => {
  const port = await startServer(t, root);

  const plain = await request(port, '/js');
  assert.equal(plain.status, 301);
  assert.equal(plain.headers.location, '/js/');

  const withQuery = await request(port, '/prototype?a=1&b=2');
  assert.equal(withQuery.status, 301);
  assert.equal(withQuery.headers.location, '/prototype/?a=1&b=2');

  const doubled = await request(port, '//js');
  assert.equal(doubled.status, 301);
  assert.equal(doubled.headers.location, '/js/');
});

test('the server refuses symlinks that point outside the root', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'noisemaker-serve-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const site = path.join(dir, 'site');
  fs.mkdirSync(site);
  fs.writeFileSync(path.join(dir, 'secret.txt'), 'secret');
  fs.writeFileSync(path.join(site, 'inside.txt'), 'inside');
  fs.symlinkSync(path.join(dir, 'secret.txt'), path.join(site, 'outside.txt'));
  fs.symlinkSync(dir, path.join(site, 'parent'));
  fs.symlinkSync(path.join(site, 'inside.txt'), path.join(site, 'alias.txt'));
  const port = await startServer(t, site);

  assert.equal((await request(port, '/inside.txt')).body, 'inside');
  assert.equal((await request(port, '/alias.txt')).body, 'inside');
  assert.equal((await request(port, '/outside.txt')).status, 404);
  assert.equal((await request(port, '/parent/secret.txt')).status, 404);
});
