import { createLazyApiProxy } from "./lazyProxy";

type TeacherApi = typeof import("../api").TeacherAPI;

export const TeacherAPI = createLazyApiProxy<TeacherApi>(
  async () => (await import("../api")).TeacherAPI,
);

