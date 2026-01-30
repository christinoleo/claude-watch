import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	isAuthEnabled,
	validatePassword,
	createAuthToken,
	AUTH_COOKIE
} from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	// If auth is not enabled, just return success
	if (!isAuthEnabled()) {
		return json({ success: true, message: 'Auth not enabled' });
	}

	const body = await request.json().catch(() => ({}));
	const password = body.password;

	if (!password || typeof password !== 'string') {
		return json({ error: 'Password required' }, { status: 400 });
	}

	if (!validatePassword(password)) {
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	// Create and set auth token cookie
	const token = createAuthToken();
	const isSecure = url.protocol === 'https:';

	cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options(isSecure));

	return json({ success: true });
};
