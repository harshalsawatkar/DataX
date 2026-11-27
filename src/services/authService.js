import { API_BASE_URL } from './apiClient';

const TOKEN_KEY = 'datax_jwt_token';
const USER_KEY = 'datax_user_profile';
const LOCAL_USERS_KEY = 'datax_local_users_store';

export function getApiBase() {
  return API_BASE_URL;
}

function getLocalUsersStore() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUsersStore(store) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Local user store error:', e);
  }
}

function buildLocalAuthResponse(userRecord) {
  const user = {
    id: userRecord.id,
    email: userRecord.email,
    fullName: userRecord.fullName,
    avatarUrl: userRecord.avatarUrl || null,
    role: userRecord.role || 'Admin',
    tenantId: userRecord.tenantId || 'tenant_enterprise',
    createdAt: userRecord.createdAt || new Date().toISOString()
  };
  const token = `dx_local_${btoa(encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, ts: Date.now() })))}`;
  return { token, user };
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const authStorage = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  },
  getUser: () => {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Storage set user error:', e);
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  }
};

export async function loginApi({ email, password }) {
  const base = getApiBase();
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    const data = await parseJsonSafe(res);
    if (res.ok && data) {
      return data;
    }
    if (res.status < 500 && data) {
      throw new Error(data.error || data.detail || 'Failed to authenticate');
    }
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  // Offline / Local Dev Fallback when Python backend (127.0.0.1:8003) is not running
  const store = getLocalUsersStore();
  const existing = store[cleanEmail];
  if (existing && existing.password && existing.password !== password) {
    throw new Error('Invalid email or password');
  }
  const userRecord = existing || {
    id: `usr_local_${Date.now()}`,
    email: cleanEmail,
    fullName: cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Enterprise User',
    role: 'Admin',
    tenantId: 'tenant_enterprise',
    createdAt: new Date().toISOString()
  };
  store[cleanEmail] = { ...userRecord, password };
  saveLocalUsersStore(store);
  return buildLocalAuthResponse(userRecord);
}

export async function registerApi({ email, password, fullName, tenantId }) {
  const base = getApiBase();
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, fullName, tenantId })
    });
    const data = await parseJsonSafe(res);
    if (res.ok && data) {
      return data;
    }
    if (res.status < 500 && data) {
      throw new Error(data.error || data.detail || 'Failed to create account');
    }
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  // Offline / Local Dev Fallback when Python backend (127.0.0.1:8003) is not running
  const store = getLocalUsersStore();
  const userRecord = {
    id: `usr_local_${Date.now()}`,
    email: cleanEmail,
    fullName: (fullName || '').trim() || cleanEmail.split('@')[0] || 'Enterprise User',
    role: 'Admin',
    tenantId: tenantId || 'tenant_enterprise',
    createdAt: new Date().toISOString(),
    password
  };
  store[cleanEmail] = userRecord;
  saveLocalUsersStore(store);
  return buildLocalAuthResponse(userRecord);
}

export async function getMeApi(token) {
  const authToken = token || authStorage.getToken();
  if (!authToken) throw new Error('No authentication token available');

  if (authToken.startsWith('dx_local_')) {
    const storedUser = authStorage.getUser();
    if (storedUser) return storedUser;
  }

  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await parseJsonSafe(res);
    if (res.ok && data && data.user) {
      return data.user;
    }
    if (res.status >= 500) {
      const cachedUser = authStorage.getUser();
      if (cachedUser) return cachedUser;
    }
    throw new Error((data && (data.error || data.detail)) || 'Invalid session');
  } catch (err) {
    const cachedUser = authStorage.getUser();
    if (cachedUser) return cachedUser;
    throw err;
  }
}
