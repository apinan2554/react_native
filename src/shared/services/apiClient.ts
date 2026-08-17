import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * Configuration for the retry mechanism
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes: number[];
}

/**
 * Queued request item for offline queue
 */
export interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retryCount: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

const API_BASE_URL = '__API_BASE_URL__'; // Replace with actual API URL at runtime

/**
 * Calculates exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseDelay: number,
  maxDelay: number,
): number {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Offline request queue for storing failed requests
 */
class RequestQueue {
  private queue: QueuedRequest[] = [];

  add(config: AxiosRequestConfig): QueuedRequest {
    const item: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      config,
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(item);
    return item;
  }

  peek(): QueuedRequest | undefined {
    return this.queue[0];
  }

  remove(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  getAll(): QueuedRequest[] {
    return [...this.queue];
  }

  getCount(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

export const requestQueue = new RequestQueue();

/**
 * Determines if a request should be retried
 */
function shouldRetry(error: AxiosError, retryConfig: RetryConfig): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // Retryable status codes
  return retryConfig.retryableStatusCodes.includes(error.response.status);
}

/**
 * Creates and configures the Axios API client instance
 * with request/response interceptors for retry logic and offline queue.
 */
function createApiClient(
  baseURL: string = API_BASE_URL,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request Interceptor: attach auth token and metadata
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Attach retry metadata
      if (!config.headers['x-retry-count']) {
        config.headers['x-retry-count'] = '0';
      }

      // Auth token will be injected by AuthService when available
      // This is a placeholder for token injection
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // Response Interceptor: handle retries and queue failed requests
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig | undefined;

      if (!config) {
        return Promise.reject(error);
      }

      const currentRetryCount = parseInt(
        (config.headers['x-retry-count'] as string) || '0',
        10,
      );

      // Check if we should retry
      if (
        shouldRetry(error, retryConfig) &&
        currentRetryCount < retryConfig.maxRetries
      ) {
        const nextRetryCount = currentRetryCount + 1;
        config.headers['x-retry-count'] = String(nextRetryCount);

        // Calculate delay with exponential backoff
        const delay = calculateBackoffDelay(
          currentRetryCount,
          retryConfig.baseDelay,
          retryConfig.maxDelay,
        );

        // Wait before retrying
        await new Promise<void>((resolve) => setTimeout(() => resolve(), delay));

        return client.request(config);
      }

      // If all retries exhausted and it's a network error, queue for later
      if (!error.response) {
        requestQueue.add({
          url: config.url,
          method: config.method,
          data: config.data,
          headers: config.headers as Record<string, string>,
        });
      }

      return Promise.reject(error);
    },
  );

  return client;
}

/**
 * Process queued requests (called when connectivity is restored)
 */
export async function processQueue(
  client: AxiosInstance,
): Promise<{ processed: number; failed: number }> {
  const items = requestQueue.getAll();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await client.request(item.config);
      requestQueue.remove(item.id);
      processed++;
    } catch {
      item.retryCount++;
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient();

export { createApiClient };
export type { RetryConfig };
