const SUPABASE_URL = 'https://zrzdlvpwztzgdviucivk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CRSSQw-HiSXfr6HFhfIaLg_eHK6K28P';

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const MAX_BYTES = 5.5 * 1024 * 1024;

function json(statusCode, obj) {
  return { statusCode: statusCode, headers: HEADERS, body: JSON.stringify(obj) };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const room = ((event.queryStringParameters && event.queryStringParameters.room) || '').trim();
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(room)) return json(400, { error: 'invalid_room' });

  const apiHeaders = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };

  if (event.httpMethod === 'GET') {
    const url = SUPABASE_URL + '/rest/v1/love_sync?id=eq.' + encodeURIComponent(room) + '&select=data,updated_at';
    const res = await fetch(url, { headers: apiHeaders });
    if (!res.ok) return json(502, { error: 'read_failed', status: res.status });
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return json(200, null);
    return json(200, { data: rows[0].data, updatedAt: rows[0].updated_at });
  }

  if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
    const body = event.body || '';
    if (Buffer.byteLength(body, 'utf8') > MAX_BYTES) return json(413, { error: 'payload_too_large' });

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return json(400, { error: 'invalid_json' });
    }
    if (!data || typeof data !== 'object') return json(400, { error: 'invalid_data' });

    const updatedAt = new Date().toISOString();
    const url = SUPABASE_URL + '/rest/v1/love_sync?on_conflict=id';
    const res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({}, apiHeaders, {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify([{ id: room, data: data, updated_at: updatedAt }])
    });
    if (!res.ok) return json(502, { error: 'write_failed', status: res.status });
    return json(200, { ok: true, updatedAt: updatedAt });
  }

  return json(405, { error: 'method_not_allowed' });
};