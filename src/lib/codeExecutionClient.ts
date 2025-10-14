// Simple REST client for code execution backend.
// NOTE: Currently assumes non-streaming responses. If backend later supports
// streaming (e.g. Server-Sent Events or WebSocket), this module can be
// extended with a streaming API while preserving these simple helpers.
// Endpoints:
// POST /api/execute/room/:roomId/start -> { status: "started" }
// POST /api/execute/room/:roomId/exec  -> body { code } -> { output }
// POST /api/execute/room/:roomId/stop  -> { status: "stopped" }

import { apiUrl as BASE_URL } from "./constants";

/**
 * Generic request helper for execution endpoints.
 * Throws with detailed message including status code and body text on failure.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Execution API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function startExecution(roomId: string) {
  return request<{ status: string }>(`/api/execute/room/${roomId}/start`);
}

export async function execCode(roomId: string, code: string) {
  return request<{ output: string }>(`/api/execute/room/${roomId}/exec`, {
    body: JSON.stringify({ code }),
  });
}

export async function stopExecution(roomId: string) {
  return request<{ status: string }>(`/api/execute/room/${roomId}/stop`);
}

export async function getExecutionStatus(roomId: string) {
  return request<{ venv: string; container: string }>(
    `/api/execute/room/${roomId}/status`,
    { method: "GET" }
  );
}
