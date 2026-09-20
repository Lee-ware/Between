// BETWEEN — anonymous Majority-mode aggregate counts.
// Only known question IDs/options are accepted. No accounts, names, IPs,
// cookies, or device identifiers are stored.

const { getStore } = require('@netlify/blobs');

const VALID_OPTIONS = {
  between_0168: ['R10 million today', 'R30 000 every month forever'],
  between_0169: ['Be rich and unknown', 'Famous and comfortable'],
  between_0170: ['5 very close friends', '100 casual friends'],
  between_0171: ['Respected', 'Liked'],
  between_0172: ['Know what everyone thinks of you', 'Never know'],
  between_0173: ['Lose your phone for a month', 'Social media for a month'],
  between_0174: ['Perfect battery life', 'Perfect internet'],
  between_0175: ['See your future', 'Change one decision from your past'],
  between_0176: ['Know when you will die', 'How you will die'],
  between_0177: ['Teleport', 'Fly'],
  between_0178: ['Pause time', 'Rewind time'],
  between_0179: ['Never fail', 'Never regret'],
  between_0180: ['Unlimited confidence', 'Unlimited self-control'],
  between_0181: ['One lifelong best friend', 'A huge changing social circle'],
  between_0182: ['Know when someone likes you', 'When they are lying'],
  between_0183: ['No homework', 'School starts two hours later'],
  between_0184: ['Huge city', 'Peaceful place'],
  between_0185: ['Perfect algorithm', 'Perfect comment section'],
  between_0186: ['Always win arguments', 'Always resolve arguments peacefully'],
  between_0187: ['One perfect year', 'A consistently good life'],
  between_0328: ['R1 million today', 'R20 000 every month'],
  between_0329: ['5 close friends', '50 regular friends'],
  between_0330: ['Social media', 'Streaming services'],
  between_0331: ['Respected', 'Liked'],
  between_0332: ['Future', 'Past'],
  between_0333: ['No homework', 'No exams'],
  between_0334: ['Perfect internet', 'Unlimited battery'],
  between_0335: ['Early', 'Late'],
  between_0336: ['Know', 'Never know'],
  between_0337: ['Confidence', 'Self-discipline'],
};

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_RETRIES = 4;

function json(statusCode, body) {
  return { statusCode, headers: { ...JSON_HEADERS, ...CORS_HEADERS }, body: JSON.stringify(body) };
}

function emptyData() { return { counts: {}, total: 0 }; }

async function getCurrent(store, id) {
  const entry = await store.getWithMetadata(id, { type: 'json', consistency: 'strong' });
  return entry || { data: null, etag: null };
}

async function incrementVote(store, id, option) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await getCurrent(store, id);
    const data = current.data || emptyData();
    const next = {
      counts: { ...data.counts, [option]: Number(data.counts[option] || 0) + 1 },
      total: Number(data.total || 0) + 1,
    };

    try {
      if (current.etag) {
        const result = await store.setJSON(id, next, { onlyIfMatch: current.etag });
        if (result.modified) return next;
      } else {
        const result = await store.setJSON(id, next, { onlyIfNew: true });
        if (result.modified) return next;
      }
    } catch (e) {
      // A concurrent writer can win the conditional write; retry from fresh data.
      if (attempt === MAX_RETRIES - 1) throw e;
    }
  }
  throw new Error('vote conflict');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  let store;
  try {
    // Consistency is selected per read below. This keeps the function compatible
    // with the current Netlify Blobs API while making vote updates strongly read.
    store = getStore('between-majority-votes');
  } catch (e) {
    return json(500, { error: 'storage unavailable' });
  }

  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id || !VALID_OPTIONS[id]) return json(400, { error: 'unknown question id' });
    const entry = await getCurrent(store, id);
    return json(200, entry.data || emptyData());
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid json body' }); }
    const { id, option } = body;
    if (!id || !VALID_OPTIONS[id]) return json(400, { error: 'unknown question id' });
    if (typeof option !== 'string' || !VALID_OPTIONS[id].includes(option)) return json(400, { error: 'invalid option' });

    try {
      const data = await incrementVote(store, id, option);
      return json(200, data);
    } catch (e) {
      console.error('[BETWEEN majority] vote write failed', e);
      return json(503, { error: 'vote temporarily unavailable' });
    }
  }

  return json(405, { error: 'method not allowed' });
};
