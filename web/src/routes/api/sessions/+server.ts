import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnrichedSessionsAsync } from '$shared/server/ws-handlers.js';

export const GET: RequestHandler = async () => {
	try {
		const sessions = await getEnrichedSessionsAsync();
		return json({
			sessions,
			count: sessions.length,
			timestamp: Date.now()
		});
	} catch {
		return json({ error: 'Error reading sessions' }, { status: 500 });
	}
};
