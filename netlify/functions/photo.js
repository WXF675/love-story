const SUPABASE_URL = 'https://zrzdlvpwztzgdviucivk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CRSSQw-HiSXfr6HFhfIaLg_eHK6K28P';

const MAX_B64_BYTES = 4.5 * 1024 * 1024;

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(statusCode, obj) {
  return { statusCode: statusCode, headers: JSON_HEADERS, body: JSON.stringify(obj) };
}

function validId(id) {
  return /^[A-Za-z0-9_-]{6,64}$/.test(id);
}

async function sb(path, options) {
  const res = await fetch(SUPABASE_URL + path, Object.assign({
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }
  }, options));
  return res;
}

exports.handler = async function (event) {
  const method = event.httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };

  if (method === 'GET') {
    const id = ((event.queryStringParameters && event.queryStringParameters.id) || '').trim();
    if (!validId(id)) return json(400, { error: 'invalid_id' });
    const rowId = 'photo_' + id;
    const res = await sb('/rest/v1/love_sync?id=eq.' + encodeURIComponent(rowId) + '&select=data');
    if (!res.ok) return json(502, { error: 'read_failed' });
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return json(404, { error: 'not_found' });
    const data = rows[0].data || {};
    if (data.deleted || !data.b64) return json(404, { error: 'not_found' });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': data.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      },
      body: data.b64,
      isBase64Encoded: true
    };
  }

  if (method === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return json(400, { error: 'invalid_json' });
    }
    const photoId = String(body.id || '').trim();
    if (!validId(photoId)) return json(400, { error: 'invalid_id' });
    const b64 = String(body.data || '');
    if (!b64 || Buffer.byteLength(b64, 'utf8') > MAX_B64_BYTES) {
      return json(413, { error: 'payload_too_large' });
    }
    const payload = {
      b64: b64,
      type: body.type || 'image/jpeg',
      room: String(body.room || ''),
      createdAt: new Date().toISOString()
    };
    const res = await sb('/rest/v1/love_sync?on_conflict=id', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify([{
        id: 'photo_' + photoId,
        data: payload,
        updated_at: new Date().toISOString()
      }])
    });
    if (!res.ok) return json(502, { error: 'write_failed' });
    return json(200, { ok: true, id: photoId });
  }

  if (method === 'DELETE') {
    const id = ((event.queryStringParameters && event.queryStringParameters.id) || '').trim();
    if (!validId(id)) return json(400, { error: 'invalid_id' });
    const rowId = 'photo_' + id;
    // Tombstone the row so the data is freed, without needing a DELETE policy.
    const res = await sb('/rest/v1/love_sync?id=eq.' + encodeURIComponent(rowId), {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ data: { deleted: true }, updated_at: new Date().toISOString() })
    });
    if (!res.ok) return json(502, { error: 'delete_failed' });
    return json(200, { ok: true });
  }

  return json(405, { error: 'method_not_allowed' });
};
