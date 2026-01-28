<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
</svelte:head>

{@render children()}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		font-family: -apple-system, system-ui, sans-serif;
		background: #0a0a0a;
		color: #eee;
		margin: 0;
		min-height: 100vh;
	}

	:global(iconify-icon) {
		font-size: 18px;
	}

	:global(iconify-icon.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
