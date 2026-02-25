import { createLazyApiProxy } from "./lazyProxy";

type StudentApi = typeof import("../api").StudentAPI;

export const StudentAPI = createLazyApiProxy<StudentApi>(
  async () => (await import("../api")).StudentAPI,
);

