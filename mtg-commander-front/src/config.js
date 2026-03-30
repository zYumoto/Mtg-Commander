const envApiUrl = import.meta.env.VITE_API_URL?.trim();
const envSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

export const API_URL = envApiUrl || "";
export const SOCKET_URL = envSocketUrl || undefined;
