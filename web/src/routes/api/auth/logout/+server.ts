import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AUTH_COOKIE } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear the auth cookie
	cookies.delete(AUTH_COOKIE.name, { path: '/' });

	return json({ success: true });
};
