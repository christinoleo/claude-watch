import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBeadsIssues } from '$shared/server/ws-handlers.js';

/**
 * GET /api/beads?project=/path/to/project
 * Returns beads issues for a project (REST fallback)
 */
export const GET: RequestHandler = async ({ url }) => {
	const project = url.searchParams.get('project');

	if (!project) {
		return json({ error: 'Missing project parameter' }, { status: 400 });
	}

	try {
		const projectPath = decodeURIComponent(project);
		const issues = await getBeadsIssues(projectPath);

		return json({
			issues,
			project: projectPath,
			timestamp: Date.now()
		});
	} catch (err) {
		return json({ error: 'Failed to fetch beads issues' }, { status: 500 });
	}
};
