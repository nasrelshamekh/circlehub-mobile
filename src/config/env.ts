const rawUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.2:5289";
const API_URL = rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");

export { API_URL };
