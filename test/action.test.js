'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ask, main } = require('../index.js');

function fakeFetch(status, body, seen) {
  return async (url, opts) => {
    if (seen) Object.assign(seen, { url, opts });
    return { ok: status < 400, status, json: async () => body };
  };
}

async function withEnv(vars, fn) {
  const saved = { ...process.env };
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gha-')), 'out');
  fs.writeFileSync(out, '');
  Object.assign(process.env, { GITHUB_OUTPUT: out }, vars);
  try { return await fn(out); } finally { process.env = saved; process.exitCode = 0; }
}

test('ask sends the bearer key, question and top_k to /api/v1/brain/ask', async () => {
  const seen = {};
  const data = await ask({ apiKey: 'ck_live_x', question: 'Is there a free plan?', baseUrl: 'https://a.example/',
    topK: 4, fetchImpl: fakeFetch(200, { answer: 'Yes.' }, seen) });
  assert.equal(seen.url, 'https://a.example/api/v1/brain/ask');
  assert.equal(seen.opts.headers.Authorization, 'Bearer ck_live_x');
  assert.deepEqual(JSON.parse(seen.opts.body), { question: 'Is there a free plan?', top_k: 4 });
  assert.equal(data.answer, 'Yes.');
});

test('ask turns an API error into a readable message', async () => {
  await assert.rejects(ask({ apiKey: 'k', question: 'q', baseUrl: 'https://a', topK: 6,
    fetchImpl: fakeFetch(401, { detail: 'Invalid API key' }) }), /401: Invalid API key/);
});

test('main writes the answer, sources and agent-name outputs', async () => {
  await withEnv({ 'INPUT_API-KEY': 'k', INPUT_QUESTION: 'q' }, async (out) => {
    const code = await main(fakeFetch(200, { answer: 'Line 1\nLine 2', agent: { name: 'Docs' },
      sources: [{ filename: 'pricing' }] }));
    assert.equal(code, 0);
    const text = fs.readFileSync(out, 'utf8');
    assert.match(text, /answer<<ghadelim_[^\n]+\nLine 1\nLine 2\n/);
    assert.match(text, /sources<<ghadelim_[^\n]+\n\[\{"filename":"pricing"\}\]\n/);
    assert.match(text, /agent-name<<ghadelim_[^\n]+\nDocs\n/);
  });
});

test('main fails the step on error unless fail-on-error is false', async () => {
  await withEnv({ 'INPUT_API-KEY': '', INPUT_QUESTION: 'q' }, async () => {
    assert.equal(await main(fakeFetch(200, {})), 1);
  });
  await withEnv({ 'INPUT_API-KEY': 'k', INPUT_QUESTION: 'q', 'INPUT_FAIL-ON-ERROR': 'false' }, async () => {
    assert.equal(await main(fakeFetch(502, { detail: 'down' })), 0);
  });
});
