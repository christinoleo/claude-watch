<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore, stateColor, getProjectColor, type Session } from '$lib/stores/sessions.svelte';

	let showFolderBrowser = $state(false);
	let browserPath = $state('');
	let browserFolders = $state<{ name: string; path: string }[]>([]);
	let browserShowHidden = $state(false);
	let browserIsRoot = $state(false);
	let browserParent = $state<string | null>(null);

	// Group sessions by project (cwd)
	const sessionsByProject = $derived(() => {
		const groups = new Map<string, Session[]>();
		for (const session of sessionStore.sessions) {
			const key = session.cwd || 'unknown';
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(session);
		}
		return groups;
	});

	// Get all projects (from sessions + saved)
	const allProjects = $derived(() => {
		const projects = new Set<string>();
		for (const session of sessionStore.sessions) {
			if (session.cwd) projects.add(session.cwd);
		}
		for (const cwd of sessionStore.savedProjects) {
			projects.add(cwd);
		}
		return [...projects].sort();
	});

	onMount(() => {
		sessionStore.loadSavedProjects();
		sessionStore.connect();
	});

	onDestroy(() => {
		sessionStore.disconnect();
	});

	async function sendKeys(target: string, keys: string) {
		await fetch(`/api/sessions/${encodeURIComponent(target)}/send`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ keys })
		});
	}

	async function killSession(id: string, pid: number, tmux_target: string | null) {
		if (!confirm('Kill this session?')) return;
		await fetch(`/api/sessions/${encodeURIComponent(id)}/kill`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pid, tmux_target })
		});
	}

	async function deleteProject(cwd: string) {
		if (!confirm(`Delete project "${cwd}" and all its sessions?`)) return;
		// Kill all sessions in this project
		const sessions = sessionsByProject().get(cwd) || [];
		for (const s of sessions) {
			await fetch(`/api/sessions/${encodeURIComponent(s.id)}/kill`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pid: s.pid, tmux_target: s.tmux_target })
			});
		}
		sessionStore.removeProject(cwd);
	}

	async function newSessionInProject(cwd: string) {
		await fetch('/api/projects/new-session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cwd })
		});
		sessionStore.saveProject(cwd);
	}

	async function openFolderBrowser() {
		showFolderBrowser = true;
		await browseTo('~');
	}

	async function browseTo(path: string) {
		const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}&showHidden=${browserShowHidden}`);
		const data = await res.json();
		if (data.error) {
			alert(data.error);
			return;
		}
		browserPath = data.current;
		browserFolders = data.folders;
		browserIsRoot = data.isRoot;
		browserParent = data.parent;
	}

	async function selectFolder() {
		showFolderBrowser = false;
		await newSessionInProject(browserPath);
	}

	function getProjectName(cwd: string): string {
		return cwd.split('/').pop() || cwd;
	}
</script>

<svelte:head>
	<title>claude-watch</title>
</svelte:head>

<div class="container">
	<header class="header">
		<h1>claude-watch</h1>
		<div class="header-actions">
			<button
				class="btn"
				class:paused={sessionStore.paused}
				onclick={() => sessionStore.togglePause()}
				title={sessionStore.paused ? 'Resume' : 'Pause'}
			>
				<iconify-icon icon={sessionStore.paused ? 'mdi:play' : 'mdi:pause'}></iconify-icon>
			</button>
			<button class="btn" onclick={openFolderBrowser} title="New Project">
				<iconify-icon icon="mdi:plus"></iconify-icon>
			</button>
		</div>
	</header>

	<p class="count">{sessionStore.sessions.length} session{sessionStore.sessions.length !== 1 ? 's' : ''}</p>

	{#if allProjects().length === 0}
		<div class="empty">No sessions yet. Click + to add a project.</div>
	{:else}
		{#each allProjects() as cwd}
			{@const sessions = sessionsByProject().get(cwd) || []}
			{@const color = getProjectColor(cwd)}
			<div class="project-group">
				<div class="project-header" style="background: {color}20; color: {color}">
					<span class="dot" style="background: {color}"></span>
					<span class="name">{getProjectName(cwd)}</span>
					<span class="count-badge">{sessions.length}</span>
					<div class="spacer"></div>
					<button onclick={() => newSessionInProject(cwd)} title="New Session">
						<iconify-icon icon="mdi:plus"></iconify-icon>
					</button>
					<button class="delete" onclick={() => deleteProject(cwd)} title="Delete Project">
						<iconify-icon icon="mdi:delete"></iconify-icon>
					</button>
				</div>
				<div class="project-sessions">
					{#each sessions as session}
						{#if session.tmux_target}
							<a href="/session/{encodeURIComponent(session.tmux_target)}" class="session {session.state}">
								<span class="state" style="background: {stateColor(session.state)}"></span>
								<div class="session-info">
									<div class="target">{session.pane_title || session.tmux_target}</div>
									{#if session.current_action}
										<div class="action">{session.current_action}</div>
									{/if}
								</div>
								<div class="actions">
									<button
										onclick={(e) => { e.preventDefault(); sendKeys(session.tmux_target!, 'Escape'); }}
										title="Stop (Esc)"
									>
										<iconify-icon icon="mdi:stop"></iconify-icon>
									</button>
									<button
										class="danger"
										onclick={(e) => { e.preventDefault(); killSession(session.id, session.pid, session.tmux_target); }}
										title="Kill"
									>
										<iconify-icon icon="mdi:power"></iconify-icon>
									</button>
								</div>
							</a>
						{:else}
							<div class="session {session.state} no-tmux">
								<span class="state" style="background: {stateColor(session.state)}"></span>
								<div class="session-info">
									<div class="target">{session.id}</div>
									{#if session.current_action}
										<div class="action">{session.current_action}</div>
									{/if}
									<div class="no-tmux-label">No tmux pane</div>
								</div>
								<div class="actions">
									<button
										class="danger"
										onclick={() => killSession(session.id, session.pid, session.tmux_target)}
										title="Kill"
									>
										<iconify-icon icon="mdi:power"></iconify-icon>
									</button>
								</div>
							</div>
						{/if}
					{:else}
						<div class="empty-project">No active sessions</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

{#if showFolderBrowser}
	<div class="folder-modal" onclick={() => showFolderBrowser = false}>
		<div class="folder-browser" onclick={(e) => e.stopPropagation()}>
			<div class="fb-header">
				<h3>Select Folder</h3>
				<button onclick={() => showFolderBrowser = false}>
					<iconify-icon icon="mdi:close"></iconify-icon>
				</button>
			</div>
			<div class="fb-path">
				{browserPath}
			</div>
			<div class="fb-options">
				<label>
					<input type="checkbox" bind:checked={browserShowHidden} onchange={() => browseTo(browserPath)} />
					Show hidden
				</label>
			</div>
			<div class="fb-list">
				{#if !browserIsRoot && browserParent}
					<button class="fb-item" onclick={() => browseTo(browserParent!)}>
						<iconify-icon icon="mdi:folder-arrow-up"></iconify-icon>
						..
					</button>
				{/if}
				{#each browserFolders as folder}
					<button class="fb-item" onclick={() => browseTo(folder.path)}>
						<iconify-icon icon="mdi:folder"></iconify-icon>
						{folder.name}
					</button>
				{/each}
			</div>
			<div class="fb-footer">
				<button class="btn" onclick={() => showFolderBrowser = false}>Cancel</button>
				<button class="btn primary" onclick={selectFolder}>Select</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.container {
		padding: 16px;
		max-width: 800px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #222;
	}

	.header h1 {
		color: #fff;
		font-size: 24px;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.btn {
		background: #333;
		color: #fff;
		border: none;
		padding: 12px 16px;
		font-size: 16px;
		cursor: pointer;
		border-radius: 8px;
		touch-action: manipulation;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn:active {
		background: #444;
	}

	.btn.paused {
		background: #c0392b;
	}

	.btn.primary {
		background: #27ae60;
	}

	.count {
		color: #666;
		font-size: 14px;
		margin: 0 0 16px 0;
	}

	.empty {
		color: #555;
		text-align: center;
		padding: 40px;
		font-size: 16px;
	}

	.project-group {
		margin-bottom: 20px;
	}

	.project-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 8px 8px 0 0;
		font-weight: 700;
		font-size: 16px;
	}

	.project-header .dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-header .name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-header .count-badge {
		background: rgba(255, 255, 255, 0.2);
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 12px;
	}

	.project-header .spacer {
		flex: 1;
	}

	.project-header button {
		background: transparent;
		border: none;
		font-size: 18px;
		cursor: pointer;
		color: inherit;
		opacity: 0.7;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		min-height: 32px;
	}

	.project-header button:hover {
		opacity: 1;
	}

	.project-header button.delete:hover {
		color: #e74c3c;
	}

	.project-sessions .session {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: #1a1a1a;
		border-top: 1px solid #333;
		text-decoration: none;
		color: inherit;
		border-left: 4px solid #444;
	}

	.project-sessions .session:last-child {
		border-radius: 0 0 8px 8px;
	}

	.session.permission,
	.session.waiting {
		border-left-color: #e74c3c;
	}

	.session.idle {
		border-left-color: #f39c12;
	}

	.session.busy {
		border-left-color: #27ae60;
	}

	.session .state {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.session-info {
		flex: 1;
		min-width: 0;
	}

	.session .target {
		font-weight: 600;
		font-size: 16px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.session .action {
		color: #aaa;
		font-size: 14px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.session.no-tmux {
		cursor: default;
		opacity: 0.7;
	}

	.no-tmux-label {
		color: #666;
		font-size: 12px;
		font-style: italic;
	}

	.empty-project {
		padding: 16px;
		background: #1a1a1a;
		color: #666;
		text-align: center;
		border-radius: 0 0 8px 8px;
	}

	.actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.actions button {
		background: #222;
		color: #aaa;
		border: none;
		padding: 8px 10px;
		font-size: 16px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: manipulation;
	}

	.actions button:hover {
		color: #fff;
		background: #333;
	}

	.actions button.danger {
		background: #7f1d1d;
		color: #fca5a5;
	}

	.actions button.danger:hover {
		background: #991b1b;
		color: #fff;
	}

	/* Folder Browser Modal */
	.folder-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.folder-browser {
		background: #1a1a1a;
		border-radius: 12px;
		width: 94%;
		max-width: 500px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.fb-header {
		padding: 16px;
		border-bottom: 1px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.fb-header h3 {
		margin: 0;
		font-size: 18px;
	}

	.fb-header button {
		background: transparent;
		border: none;
		color: #888;
		cursor: pointer;
		padding: 4px;
	}

	.fb-path {
		padding: 12px 16px;
		background: #111;
		font-family: monospace;
		font-size: 14px;
		color: #888;
		word-break: break-all;
	}

	.fb-options {
		padding: 8px 16px;
		border-bottom: 1px solid #333;
	}

	.fb-options label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #888;
		cursor: pointer;
	}

	.fb-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.fb-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px;
		background: transparent;
		border: none;
		color: #eee;
		font-size: 16px;
		text-align: left;
		cursor: pointer;
		border-radius: 8px;
	}

	.fb-item:hover {
		background: #333;
	}

	.fb-footer {
		padding: 16px;
		border-top: 1px solid #333;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}
</style>
