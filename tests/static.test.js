import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { contentType, resolvePath, createStaticServer } from '../scripts/static.js';

const root = path.resolve(import.meta.dirname, '..');

function rawStatus(port, rawPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port, path: rawPath }, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on('error', reject);
  });
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
  const server = createStaticServer(root);
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;

  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.equal(index.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(await index.text(), /<html/i);

  const worker = await fetch(`${base}/js/worker.js`);
  assert.equal(worker.status, 200);
  assert.equal(worker.headers.get('content-type'), 'text/javascript; charset=utf-8');
  await worker.arrayBuffer();

  for (const url of ['/missing.html', '/js', '/js/', '/.git/HEAD', '/../package.json', '/%2e%2e/package.json', '/js/..%2f..%2fpackage.json']) {
    assert.equal(await rawStatus(server.address().port, url), 404, url);
  }

  const post = await fetch(`${base}/`, { method: 'POST' });
  assert.equal(post.status, 405);
  await post.arrayBuffer();
});
