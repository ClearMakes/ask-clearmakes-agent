// Ask ClearMakes Agent: one grounded answer from a ClearMakes Agents assistant.
// No dependencies: Node's own fetch plus GitHub's workflow commands and output file.
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const MAX_QUESTION_CHARS = 4000; // the API's own limit

function input(name, fallback = '') {
  const v = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`];
  return v === undefined || v.trim() === '' ? fallback : v.trim();
}

function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  const text = String(value ?? '');
  if (!file) { console.log(`${name}=${text}`); return; }
  const delim = `ghadelim_${crypto.randomUUID()}`;
  fs.appendFileSync(file, `${name}<<${delim}\n${text}\n${delim}\n`);
}

async function ask({ apiKey, question, baseUrl, topK, fetchImpl = fetch }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/brain/ask`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'clearmakes-agents-github-action/1.0',
    },
    body: JSON.stringify({ question: question.slice(0, MAX_QUESTION_CHARS), top_k: topK }),
    signal: AbortSignal.timeout(90000),
  });
  let body = null;
  try { body = await res.json(); } catch (_) { body = null; }
  if (!res.ok) {
    const d = body && body.detail;
    const detail = d === undefined || d === null ? '' : (typeof d === 'string' ? d : JSON.stringify(d));
    throw new Error(`ClearMakes Agents answered ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return body || {};
}

async function main(fetchImpl = fetch) {
  const apiKey = input('api-key');
  const question = input('question');
  const baseUrl = input('api-base-url', 'https://agents.clearmakes.com');
  const topK = Math.min(20, Math.max(1, parseInt(input('top-k', '6'), 10) || 6));
  const failOnError = input('fail-on-error', 'true').toLowerCase() !== 'false';

  if (apiKey) console.log(`::add-mask::${apiKey}`);
  try {
    if (!apiKey) throw new Error('api-key is empty. Add your agent API key as a repository secret and pass it in.');
    if (!question) throw new Error('question is empty.');
    const data = await ask({ apiKey, question, baseUrl, topK, fetchImpl });
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const name = (data.agent && data.agent.name) || '';
    setOutput('answer', data.answer || '');
    setOutput('sources', JSON.stringify(sources));
    setOutput('agent-name', name);
    console.log(`Answered by "${name || 'agent'}" from ${sources.length} passage(s).`);
    return 0;
  } catch (err) {
    setOutput('answer', '');
    setOutput('sources', '[]');
    setOutput('agent-name', '');
    if (failOnError) { console.log(`::error::${err.message}`); process.exitCode = 1; return 1; }
    console.log(`::warning::${err.message}`);
    return 0;
  }
}

module.exports = { ask, main, setOutput };
if (require.main === module) main();
