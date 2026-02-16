import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execFileSync } from 'child_process';

export const GET: RequestHandler = async ({ params }) => {
	const target = decodeURIComponent(params.target);
	try {
		const output = execFileSync('tmux', ['capture-pane', '-t', target, '-p', '-e', '-S', '-100'], { encoding: 'utf-8' });
		return json({ output, timestamp: Date.now() });
	} catch {
		return json({ error: 'Failed to capture pane' }, { status: 500 });
	}
};
