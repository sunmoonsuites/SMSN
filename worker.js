/**
 * Cloudflare Worker Entrypoint (worker.js)
 * Synchronized with cloudflare-worker.js
 */
import workerHandler, { handleApiRequest } from './cloudflare-worker.js';

export { handleApiRequest };
export default workerHandler;
