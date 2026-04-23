const STORAGE_KEY = 'klick-data';
const API_URL = '/.netlify/functions/klick-data';

const readLocalState = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeLocalState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser storage can be unavailable in private mode.
  }
};

export const fetchRemoteGameState = async () => {
  const response = await fetch(API_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load game state: ${response.status}`);
  }
  const state = await response.json();
  return state && state.hasData ? state.data : null;
};

export const loadGameState = async () => {
  try {
    const remoteState = await fetchRemoteGameState();
    if (remoteState) {
      writeLocalState(remoteState);
      return remoteState;
    }

    const localState = readLocalState();
    if (localState) {
      await saveGameState(localState);
      return localState;
    }
  } catch {
    return readLocalState();
  }

  return null;
};

export const saveGameState = async (state) => {
  writeLocalState(state);

  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Could not save game state: ${response.status}`);
  }
};
