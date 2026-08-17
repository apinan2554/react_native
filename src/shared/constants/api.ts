/**
 * API configuration constants
 */

/** Base URL for the backend API */
export const API_BASE_URL = 'https://api.warehouse.example.com/v1';

/** Request timeout in milliseconds */
export const API_TIMEOUT_MS = 10_000;

/** Upload timeout for large files (images, documents) */
export const API_UPLOAD_TIMEOUT_MS = 30_000;

/** Maximum request payload size in bytes (10MB) */
export const API_MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;

/** Default page size for paginated results */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size allowed */
export const MAX_PAGE_SIZE = 100;
