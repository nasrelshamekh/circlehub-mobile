// EXPO_PUBLIC_* is inlined at bundle time: reference it as a full static
// expression. Plain HTTP on :5289 is the only profile a device can reach.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.2:5289";

export { API_URL };