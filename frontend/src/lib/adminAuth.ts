"use client";

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
}

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("adminToken", token);
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("adminToken");
}

export function requireAdmin() {
  const token = getAdminToken();
  return !!token;
}

export function getAuthHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
