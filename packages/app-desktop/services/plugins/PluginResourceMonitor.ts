import bridge from '../bridge';

export interface PluginResourceMetric {
	memory: number;
	peakMemory: number;
	cpu: number;
}

export interface PluginResourceData {
	[key: string]: PluginResourceMetric;
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
	private resourceMetrics_: PluginResourceData;

	public constructor() {
		this.intervalId_ = null;
		this.resourceMetrics_ = {};
	}

	public ResourceMonitorGUIUpdate: (resourceMetrics: PluginResourceData)=> void | null = null;

	private startResourceMonitor() {
		this.intervalId_ = setInterval(() => {

			const appMetrics = bridge().electronApp().electronApp().getAppMetrics();

			for (const metric of appMetrics) {
				this.resourceMetrics_[String(metric.pid)] = {
					memory: metric.memory.workingSetSize,
					peakMemory: metric.memory.peakWorkingSetSize,
					cpu: metric.cpu.percentCPUUsage,
				};
			}

			if (this.ResourceMonitorGUIUpdate) {
				this.ResourceMonitorGUIUpdate(this.resourceMetrics_);
			}
		}, 5000);
	}

	private stopResourceMonitor() {
		if (!this.intervalId_) return null;
		clearInterval(this.intervalId_);
		return this.intervalId_;
	}

	public get resourceMetrics() {
		return this.resourceMetrics_;
	}

	public async start() {
		this.startResourceMonitor();
	}

	public async stop() {
		this.stopResourceMonitor();
	}

}
