import { QueryClient, QueryCache } from '@tanstack/react-query';
import { logger } from './logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: any) => {
        logger.error('Unhandled mutation error', error);
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error: any) => {
      logger.error('Unhandled query error', error);
    }
  })
});
