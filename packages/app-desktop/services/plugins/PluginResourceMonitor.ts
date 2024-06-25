import bridge from '../bridge';

export interface ResourceMetric {
	memory: number;
	peakMemory: number;
	cpu: number;
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
	private resourceMetrics_: { [key: string]: ResourceMetric };

	public constructor() {
		this.intervalId_ = null;
		this.resourceMetrics_ = {};
	}

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
