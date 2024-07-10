import PluginService from '@joplin/lib/services/plugins/PluginService';
import bridge from '../bridge';
export interface PluginResourceMetric {
	osPid: number;
	name: string;
	memory: number;
	peakMemory: number;
	cpu: number;
	runningStatus: boolean;
}

export class PluginResourceMonitor {

	private static instance_: PluginResourceMonitor = null;

	public static instance(): PluginResourceMonitor {
		if (!this.instance_) {
			this.instance_ = new PluginResourceMonitor();
		}

		return this.instance_;
	}

	private intervalId_: ReturnType<typeof setTimeout>;
	private resourceMetrics_: PluginResourceMetric[];
	private window_: Window | null = null;

	public constructor() {
		this.intervalId_ = null;
		this.resourceMetrics_ = [];
	}

	public ResourceMonitorGUIUpdate: (resourceMetrics: PluginResourceMetric[])=> void | null = null;

	private parseResourceMetrics(): PluginResourceMetric[] {

		const appMetrics = bridge().electronApp().electronApp().getAppMetrics();
		const data = [];

		for (const metric of appMetrics) {
			const osPid = metric.pid as number;
			if (osPid) {
				const plugin = PluginService.instance().pluginByOsPid(osPid);
				if (plugin) {
					data.push({
						osPid,
						name: plugin.manifest.name,
						memory: metric.memory.workingSetSize,
						peakMemory: metric.memory.peakWorkingSetSize,
						cpu: metric.cpu.percentCPUUsage,
						runningStatus: plugin.running,
					});
				}
			}
		}
		return data;
	}

	private startResourceMonitor() {
		this.intervalId_ = setInterval(() => {

			this.resourceMetrics_ = this.parseResourceMetrics();

			if (this.ResourceMonitorGUIUpdate) {
				this.ResourceMonitorGUIUpdate(this.resourceMetrics_);
			}
		}, 2000);
	}

	private stopResourceMonitor() {
		if (!this.intervalId_) return null;
		clearInterval(this.intervalId_);
		return this.intervalId_;
	}

	public get resourceMetrics() {
		return this.resourceMetrics_;
	}

	public get window() {
		return this.window_;
	}

	public set window(window: Window | null) {
		this.window_ = window;
	}

	public async start() {
		this.startResourceMonitor();
	}

	public async stop() {
		this.stopResourceMonitor();
	}

}
