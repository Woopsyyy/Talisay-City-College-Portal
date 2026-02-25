import { createLazyApiProxy } from "./lazyProxy";

type AuthApi = typeof import("../api").AuthAPI;

export const AuthAPI = createLazyApiProxy<AuthApi>(
  async () => (await import("../api")).AuthAPI,
);

