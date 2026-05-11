import { getStore } from '@netlify/blobs';

export const handler = async () => {
  try {
    const store = getStore('long-and-short');
    const data = await store.get('library', { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || { items: [] }),
    };
  } catch (err) {
    console.error('library-read error:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [], error: err.message }),
    };
  }
};
