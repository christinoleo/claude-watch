import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAuthEnabled, validateAuthToken, AUTH_COOKIE } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ cookies }) => {
	// If auth is not enabled, redirect to home
	if (!isAuthEnabled()) {
		throw redirect(302, '/');
	}

	// If already authenticated, redirect to home
	const token = cookies.get(AUTH_COOKIE.name);
	if (validateAuthToken(token)) {
		throw redirect(302, '/');
	}

	return {};
};
