import Conf from 'conf';

const config = new Conf({ projectName: 'idp-platform' });

export function getApiUrl() {
  return config.get('apiUrl') || process.env.PLATFORM_API_URL || 'http://localhost:3020';
}

export function getToken() {
  return config.get('token') || process.env.PLATFORM_TOKEN || null;
}

export function setConfig(key, value) {
  config.set(key, value);
}

export function getConfig() {
  return {
    apiUrl: getApiUrl(),
    token: getToken() ? '***' : '(none)',
  };
}

export async function api(path, options = {}) {
  const url = `${getApiUrl()}${path}`;
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

export function getAppSlug(opts) {
  if (opts?.app) return opts.app;
  // Derive from current directory name
  const cwd = process.cwd();
  return cwd.split(/[\\/]/).pop().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
