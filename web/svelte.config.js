import adapter from 'svelte-adapter-bun';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: '../dist/web',
			precompress: false
		}),
		alias: {
			$shared: join(__dirname, '../src')
		}
	}
};

export default config;
