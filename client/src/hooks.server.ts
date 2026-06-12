import type { Handle } from '@sveltejs/kit';

// DB connection is established lazily by the handlers that need it (via
// dbConnect()), so routes that don't touch the database — like the landing
// page — render even without a configured MongoDB.
export const handle: Handle = async ({ event, resolve }) => {
  return await resolve(event);
};
