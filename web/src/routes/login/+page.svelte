<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';

	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});

			const data = await response.json();

			if (response.ok) {
				goto('/');
				return;
			} else {
				error = data.error || 'Login failed';
			}
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Claude Watch</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-stone-950 p-4">
	<div class="w-full max-w-sm space-y-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-stone-100">Claude Watch</h1>
			<p class="mt-2 text-sm text-stone-400">Enter password to continue</p>
		</div>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<input
					type="password"
					bind:value={password}
					placeholder="Password"
					required
					disabled={loading}
					class="w-full rounded-md border border-stone-700 bg-stone-900 px-4 py-2 text-stone-100 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 disabled:opacity-50"
				/>
			</div>

			{#if error}
				<p class="text-sm text-red-400">{error}</p>
			{/if}

			<Button type="submit" class="w-full" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign in'}
			</Button>
		</form>
	</div>
</div>
