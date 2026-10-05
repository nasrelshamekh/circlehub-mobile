// Single source of truth for the backend base URL.
//
// Set EXPO_PUBLIC_API_URL in `.env` (or your shell) to point at a different
// machine. Expo inlines EXPO_PUBLIC_* variables at bundle time, so this must be
// referenced as a full static expression — no destructuring, no indirection.
//
// Use plain HTTP on the port the backend's `http` launch profile binds (5289).
// The `https` profile redirects plain HTTP to 7200, which is bound to localhost
// only and uses an untrusted dev certificate — neither works from a device.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.2:5289";

export { API_URL };