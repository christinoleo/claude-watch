import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { homedir } from 'os';
import { existsSync, statSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';

export const GET: RequestHandler = async ({ url }) => {
	let targetPath = url.searchParams.get('path') || homedir();
	const showHidden = url.searchParams.get('showHidden') === 'true';

	// Normalize and resolve path
	if (targetPath.startsWith('~')) {
		targetPath = targetPath.replace('~', homedir());
	}
	targetPath = resolve(targetPath);

	try {
		if (!existsSync(targetPath)) {
			return json({ error: 'Directory not found' }, { status: 404 });
		}

		const stat = statSync(targetPath);
		if (!stat.isDirectory()) {
			return json({ error: 'Not a directory' }, { status: 400 });
		}

		const entries = readdirSync(targetPath, { withFileTypes: true });
		const folders = entries
			.filter((e) => {
				if (!e.isDirectory()) return false;
				if (!showHidden && e.name.startsWith('.')) return false;
				return true;
			})
			.map((e) => ({
				name: e.name,
				path: join(targetPath, e.name)
			}))
			.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

		const parent = dirname(targetPath);
		const isRoot = targetPath === '/' || targetPath === parent;

		return json({
			current: targetPath,
			parent: isRoot ? null : parent,
			isRoot,
			folders
		});
	} catch (err: unknown) {
		const error = err as { code?: string };
		if (error.code === 'ENOENT') {
			return json({ error: 'Directory not found' }, { status: 404 });
		}
		if (error.code === 'EACCES') {
			return json({ error: 'Permission denied' }, { status: 403 });
		}
		return json({ error: 'Failed to read directory' }, { status: 500 });
	}
};
