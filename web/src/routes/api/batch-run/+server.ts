import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { batchRunManager } from '$shared/server/batch-run.js';

/**
 * GET /api/batch-run - List all active batch runs
 */
export const GET: RequestHandler = async () => {
	return json({
		batchRuns: batchRunManager.getAll(),
		timestamp: Date.now()
	});
};

/**
 * POST /api/batch-run - Start a new batch run
 * Body: { sessionId, tmuxTarget, projectPath, epicId, promptTemplate? }
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { sessionId, tmuxTarget, projectPath, epicId, promptTemplate } = body;

	if (!sessionId || !tmuxTarget || !projectPath || !epicId) {
		return json(
			{ error: 'Missing required fields: sessionId, tmuxTarget, projectPath, epicId' },
			{ status: 400 }
		);
	}

	try {
		const run = await batchRunManager.start({
			sessionId,
			tmuxTarget,
			projectPath,
			epicId,
			promptTemplate
		});
		return json(run);
	} catch (err) {
		return json({ error: String(err) }, { status: 409 });
	}
};
