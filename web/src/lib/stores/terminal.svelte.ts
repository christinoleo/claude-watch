import { browser } from '$app/environment';

class TerminalStore {
	output = $state('');
	connected = $state(false);

	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private target: string | null = null;

	connect(target: string): void {
		if (!browser || this.ws) return;

		this.target = target;
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const encodedTarget = encodeURIComponent(target);
		this.ws = new WebSocket(`${protocol}//${window.location.host}/api/sessions/${encodedTarget}/stream`);

		this.ws.onopen = () => {
			this.connected = true;
			if (this.reconnectTimer) {
				clearTimeout(this.reconnectTimer);
				this.reconnectTimer = null;
			}
		};

		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.output !== undefined) {
				this.output = data.output;
			}
		};

		this.ws.onclose = () => {
			this.connected = false;
			this.ws = null;
			// Reconnect after 2 seconds if we still have a target
			if (this.target) {
				this.reconnectTimer = setTimeout(() => this.connect(this.target!), 2000);
			}
		};

		this.ws.onerror = () => {
			this.ws?.close();
		};
	}

	disconnect(): void {
		this.target = null;
		this.ws?.close();
		this.ws = null;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}
}

export const terminalStore = new TerminalStore();
