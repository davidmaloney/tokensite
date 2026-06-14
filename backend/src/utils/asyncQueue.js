// asyncQueue.js — PostgreSQL handles concurrency natively via connection pooling.
// Kept as a passthrough so all existing imports continue to work without changes.
// dbWriteQueue.push(fn) now calls fn() directly with no queuing.

export class AsyncQueue {
  async push(fn) {
    return fn();
  }
}

export const dbWriteQueue = new AsyncQueue();
