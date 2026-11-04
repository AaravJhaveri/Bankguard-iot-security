/**
 * Authorized-Passage Window service.
 * Tracks short-lived valid entry windows triggered by successful employee authentication.
 */

const windows = new Map(); // zone -> { employeeId, employeeRef, expiresAt, timer }

const DEFAULT_WINDOW_MS = 30000;

function openWindow(zone = 'ENTRANCE', employeeId, employeeRef, durationMs = DEFAULT_WINDOW_MS) {
  if (windows.has(zone)) {
    clearTimeout(windows.get(zone).timer);
  }

  const expiresAt = Date.now() + durationMs;
  const timer = setTimeout(() => {
    windows.delete(zone);
  }, durationMs);

  windows.set(zone, {
    employeeId,
    employeeRef,
    expiresAt,
    timer,
  });
}

function hasActiveWindow(zone = 'ENTRANCE') {
  const windowData = windows.get(zone);
  if (!windowData) return null;
  if (Date.now() > windowData.expiresAt) {
    windows.delete(zone);
    return null;
  }
  return windowData;
}

function consumeWindow(zone = 'ENTRANCE') {
  const windowData = hasActiveWindow(zone);
  if (windowData) {
    clearTimeout(windowData.timer);
    windows.delete(zone);
    return windowData;
  }
  return null;
}

module.exports = {
  openWindow,
  hasActiveWindow,
  consumeWindow,
};

