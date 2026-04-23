import { connectLambda, getStore } from '@netlify/blobs';

const STORE_NAME = 'maexle-score-board';
const STATE_KEY = 'klick-data';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const sanitizeState = (state) => {
  if (!isObject(state)) return null;

  const people = Array.isArray(state.people)
    ? state.people
        .filter((person) => isObject(person) && person.id && person.name)
        .map((person) => ({
          id: String(person.id),
          name: String(person.name).slice(0, 80),
          color: typeof person.color === 'string' ? person.color : '#FF6B6B',
          inGame: person.inGame !== false,
        }))
    : [];

  if (people.length === 0) return null;

  const clicks = Array.isArray(state.clicks)
    ? state.clicks.filter((click) => isObject(click) && click.personId && click.timestamp)
    : [];

  const schandeLog = Array.isArray(state.schandeLog)
    ? state.schandeLog.filter((entry) => isObject(entry) && entry.personId && entry.timestamp)
    : [];

  return {
    people,
    clicks,
    schandeLog,
    schandeScores: isObject(state.schandeScores) ? state.schandeScores : {},
    lastDecay: Number.isFinite(state.lastDecay) ? state.lastDecay : Date.now(),
    updatedAt: Date.now(),
  };
};

const response = (statusCode, body) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' };
  }

  connectLambda(event);
  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    const data = await store.get(STATE_KEY, { type: 'json', consistency: 'strong' });
    return response(200, { hasData: Boolean(data), data: data || null });
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return response(400, { error: 'Invalid JSON body' });
    }

    const state = sanitizeState(body);
    if (!state) {
      return response(400, { error: 'Invalid game state' });
    }

    await store.setJSON(STATE_KEY, state);
    return response(200, { hasData: true, data: state });
  }

  return response(405, { error: 'Method not allowed' });
};
