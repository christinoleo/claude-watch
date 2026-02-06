import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { batchRunManager } from '$shared/server/batch-run.js';

/**
 * GET /api/batch-run/:id - Get a specific batch run
 */
export const GET: RequestHandler = async ({ params }) => {
	const run = batchRunManager.get(params.id);
	if (!run) {
		return json({ error: 'Batch run not found' }, { status: 404 });
	}
	return json(run);
};

/**
 * POST /api/batch-run/:id - Control a batch run
 * Body: { action: 'pause' | 'resume' | 'stop' }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const { action } = body;

	switch (action) {
		case 'pause': {
			const run = batchRunManager.pause(params.id);
			if (!run) return json({ error: 'Cannot pause (not running or not found)' }, { status: 400 });
			return json(run);
		}
		case 'resume': {
			const run = await batchRunManager.resume(params.id);
			if (!run) return json({ error: 'Cannot resume (not paused or not found)' }, { status: 400 });
			return json(run);
		}
		case 'stop': {
			const ok = batchRunManager.stop(params.id);
			if (!ok) return json({ error: 'Batch run not found' }, { status: 404 });
			return json({ ok: true });
		}
		default:
			return json({ error: 'Invalid action. Use: pause, resume, stop' }, { status: 400 });
	}
};

/**
 * DELETE /api/batch-run/:id - Stop and remove a batch run
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const ok = batchRunManager.stop(params.id);
	if (!ok) return json({ error: 'Batch run not found' }, { status: 404 });
	return json({ ok: true });
};
