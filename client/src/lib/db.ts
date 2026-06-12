import mongoose, { type Mongoose } from 'mongoose';
import { env } from '$env/dynamic/private';

/**
 * Serverless-safe mongoose connection.
 *
 * On Vercel each function invocation may run in a fresh (or recycled) container.
 * We cache the connection — and crucially the in-flight connection *promise* —
 * on `globalThis` so that:
 *   - warm invocations reuse the existing socket instead of dialing again, and
 *   - concurrent cold-start invocations share one connect() instead of each
 *     opening a new connection and exhausting the Atlas connection limit.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cache;

const dbConnect = async (): Promise<Mongoose> => {
  if (cache.conn) {
    return cache.conn;
  }
  if (!env.SECRET_MONGO_URI) {
    throw new Error('Please define the SECRET_MONGO_URI environment variable inside .env');
  }

  if (!cache.promise) {
    // bufferCommands: false fails fast instead of queueing queries against a
    // dead connection — important on serverless where the container may be gone.
    cache.promise = mongoose.connect(env.SECRET_MONGO_URI, { bufferCommands: false });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Reset so the next request can retry rather than awaiting a rejected promise.
    cache.promise = null;
    throw err;
  }

  return cache.conn;
};

export { dbConnect };
