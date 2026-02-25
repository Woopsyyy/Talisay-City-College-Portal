type AnyObject = Record<string, any>;

export const createLazyApiProxy = <T extends AnyObject>(
  loader: () => Promise<T>,
): T =>
  new Proxy({} as T, {
    get: (_target, prop) => {
      if (prop === "then") return undefined;

      return async (...args: any[]) => {
        const api = await loader();
        const value = (api as AnyObject)[String(prop)];

        if (typeof value !== "function") {
          if (args.length === 0) return value;
          throw new Error(`API property "${String(prop)}" is not callable.`);
        }

        return value.apply(api, args);
      };
    },
  });
