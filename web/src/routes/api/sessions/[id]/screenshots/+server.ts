import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession, removeScreenshot } from '$shared/db/index.js';

export const DELETE: RequestHandler = async ({ params, url }) => {
	const id = decodeURIComponent(params.id);
	const path = url.searchParams.get('path');

	if (!id) {
		return json({ error: 'Session ID required' }, { status: 400 });
	}

	if (!path) {
		return json({ error: 'Screenshot path required' }, { status: 400 });
	}

	try {
		const session = getSession(id);
		if (!session) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		const removed = removeScreenshot(id, path);
		if (!removed) {
			return json({ error: 'Screenshot not found' }, { status: 404 });
		}

		return json({ ok: true });
	} catch {
		return json({ error: 'Failed to remove screenshot' }, { status: 500 });
	}
};
