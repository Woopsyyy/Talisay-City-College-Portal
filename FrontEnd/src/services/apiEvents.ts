let activeRequests = 0;
const loadingSubscribers = new Set<(active: boolean) => void>();
const unauthorizedSubscribers = new Set<() => void>();

const emitLoading = () => {
  const active = activeRequests > 0;
  loadingSubscribers.forEach((callback) => {
    try {
      callback(active);
    } catch (_) {}
  });
};

export const beginApiRequest = () => {
  activeRequests += 1;
  emitLoading();
};

export const endApiRequest = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  emitLoading();
};

export const subscribeToApiLoading = (callback: (active: boolean) => void) => {
  loadingSubscribers.add(callback);
  callback(activeRequests > 0);
  return () => loadingSubscribers.delete(callback);
};

export const emitUnauthorized = () => {
  unauthorizedSubscribers.forEach((callback) => {
    try {
      callback();
    } catch (_) {}
  });
};

export const subscribeToUnauthorized = (callback: () => void) => {
  unauthorizedSubscribers.add(callback);
  return () => unauthorizedSubscribers.delete(callback);
};

