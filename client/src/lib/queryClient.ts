import { QueryClient } from '@tanstack/react-query';

// Custom fetch function that handles API requests
async function apiRequest<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': 'current-user', // This would be dynamic in a real app
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Create a query client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => {
        const [url] = queryKey as [string];
        return apiRequest(url);
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except for 408, 429
        if (error instanceof Error && error.message.includes('4')) {
          const status = parseInt(error.message.match(/\d+/)?.[0] || '400');
          if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export { apiRequest };