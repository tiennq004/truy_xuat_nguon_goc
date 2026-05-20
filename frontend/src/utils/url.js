let cachedLanIp = null;

export function setLanIp(ip) {
  cachedLanIp = ip || null;
}

export function getLanIp() {
  return cachedLanIp;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getApiBase() {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  const { protocol, hostname } = window.location;
  if (isLocalHost(hostname) && cachedLanIp) {
    return `${protocol}//${cachedLanIp}:4000/api`;
  }
  return `${protocol}//${hostname}:4000/api`;
}

export function getVerifyBase() {
  if (import.meta.env.VITE_VERIFY_BASE) {
    return String(import.meta.env.VITE_VERIFY_BASE).replace(/\/$/, "");
  }
  const { protocol, hostname, origin } = window.location;
  if (isLocalHost(hostname) && cachedLanIp) {
    return `${protocol}//${cachedLanIp}:5173/verify`;
  }
  return `${origin}/verify`;
}

export function buildVerifyUrl(serial) {
  return `${getVerifyBase()}/${encodeURIComponent(serial)}`;
}

export function canPhoneScanQr() {
  const { hostname } = window.location;
  if (!isLocalHost(hostname)) return true;
  return Boolean(cachedLanIp);
}
