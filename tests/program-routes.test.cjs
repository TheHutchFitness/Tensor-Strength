const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'app/api/[[...path]]/route.js'), 'utf8');
const myPrograms = fs.readFileSync(path.join(root, 'app/clients/my-programs/page.tsx'), 'utf8');

test('multi-session program builder uses its own compatible API', () => {
  assert.match(api, /route === '\/trainer\/program-blocks' && method === 'POST'/);
  assert.match(api, /collection\('trainer_programs'\)\.insertOne\(program\)/);
  assert.match(myPrograms, /fetch\("\/api\/trainer\/program-blocks"/);
  assert.doesNotMatch(myPrograms, /fetch\("\/api\/trainer\/programs"/);
});

test('members only receive explicitly assigned program blocks', () => {
  const memberHandler = api.slice(api.indexOf("route === '/member/programs'"), api.indexOf('// ---- Coach workout scheduling'));
  assert.match(memberHandler, /clientIds: user\.id/);
  assert.doesNotMatch(memberHandler, /assignedTrainerId/);
});

test('private athlete PDF has no repository filesystem fallback', () => {
  const athleteHandler = api.slice(api.indexOf("route === '/hutch-touch/athlete-pdf'"), api.indexOf('// ---------------- MEMBER SUBSCRIPTION'));
  assert.match(athleteHandler, /if \(!r2Enabled\(\)\)/);
  assert.doesNotMatch(athleteHandler, /readFile|process\.cwd|PutObjectCommand/);
});
