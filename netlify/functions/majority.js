// netlify/functions/majority.js
//
// A tiny, free, anonymous vote counter for BETWEEN's Majority mode.
// GET  ?id=between_0168        -> current aggregate counts for that question
// POST { id, option }          -> record one vote and return the updated aggregate
//
// What this deliberately does NOT do (per the project's privacy rules):
//   - no accounts, no cookies, no session tokens
//   - never stores a name, email, IP address, or any device identifier
//   - never stores individual answer history — only a running per-option count
//   - only accepts question IDs that are real, known Majority-mode items in
//     BETWEEN's own dataset (see VALID_MAJORITY_IDS below) — an attacker can't
//     use this endpoint to store arbitrary data under arbitrary keys
//
// Honest limitation (documented rather than hidden): this endpoint does not
// deduplicate votes server-side (e.g. via IP), so a determined person could
// inflate a count by calling it directly many times. For a small, free,
// non-monetized trivia app this is an acceptable initial tradeoff rather than
// added complexity that isn't needed yet — revisit only if real abuse shows up.
// The app's own client already only submits one vote per question per device
// (see js/crowd.js), which covers normal usage.

const { getStore } = require('@netlify/blobs');

const VALID_MAJORITY_IDS = new Set([
  'between_0168', 'between_0169', 'between_0170', 'between_0171', 'between_0172',
  'between_0173', 'between_0174', 'between_0175', 'between_0176', 'between_0177',
  'between_0178', 'between_0179', 'between_0180', 'between_0181', 'between_0182',
  'between_0183', 'between_0184', 'between_0185', 'between_0186', 'between_0187',
  'between_0328', 'between_0329', 'between_0330', 'between_0331', 'between_0332',
  'between_0333', 'between_0334', 'between_0335', 'between_0336', 'between_0337',
]);

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(statusCode, body) {
  return { statusCode, headers: { ...JSON_HEADERS, ...CORS_HEADERS }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  let store;
  try {
    store = getStore({ name: 'between-majority-votes', consistency: 'strong' });
  } catch (e) {
    return json(500, { error: 'storage unavailable' });
  }

  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id || !VALID_MAJORITY_IDS.has(id)) {
      return json(400, { error: 'unknown question id' });
    }
    const data = (await store.get(id, { type: 'json' })) || { counts: {}, total: 0 };
    return json(200, data);
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return json(400, { error: 'invalid json body' });
    }
    const { id, option } = body;
    if (!id || !VALID_MAJORITY_IDS.has(id)) {
      return json(400, { error: 'unknown question id' });
    }
    if (typeof option !== 'string' || option.length === 0 || option.length > 200) {
      return json(400, { error: 'invalid option' });
    }

    const data = (await store.get(id, { type: 'json' })) || { counts: {}, total: 0 };
    data.counts[option] = (data.counts[option] || 0) + 1;
    data.total += 1;
    await store.setJSON(id, data);
    return json(200, data);
  }

  return json(405, { error: 'method not allowed' });
};
