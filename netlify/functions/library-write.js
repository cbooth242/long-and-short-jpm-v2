import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    // Parse body - Netlify sends it as a string
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { items } = body || {};

    // Strip large base64 attachments before storing to stay within blob limits
    const stripped = (items || []).map(item => ({
      ...item,
      // Keep attachments metadata but not the base64 data (too large for blobs)
      attachments: (item.attachments || []).map(a => ({
        id: a.id, name: a.name, type: a.type, size: a.size, addedAt: a.addedAt
        // omit a.data (base64) - too large
      })),
    }));

    const store = getStore('long-and-short');
    await store.setJSON('library', { items: stripped });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('library-write error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
