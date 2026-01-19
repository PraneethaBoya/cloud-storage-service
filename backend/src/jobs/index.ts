// Export all job queues and workers
export { thumbnailQueue, thumbnailWorker } from './thumbnail.job.js';

// Initialize workers on import
import './thumbnail.job.js';
