import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 24 * 60 * 60 * 1000,    // 24 hours
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export const idbValidKey = 'nermai_lms_query';

export const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(idbValidKey, client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>(idbValidKey);
  },
  removeClient: async () => {
    await del(idbValidKey);
  },
};
