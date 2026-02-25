import { createLazyApiProxy } from "./lazyProxy";

type AdminApi = typeof import("../api").AdminAPI;

export const AdminAPI = createLazyApiProxy<AdminApi>(
  async () => (await import("../api")).AdminAPI,
);

