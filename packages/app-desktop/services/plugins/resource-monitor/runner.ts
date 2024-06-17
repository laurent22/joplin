import bridge from '../../bridge';

export interface ResourceMetric {
	memory: number;
	peakMemory: number;
	cpu: number;
}

export const resourceMetrics: { [key: number]: ResourceMetric } = {};

let resourceMonitorTimer: ReturnType<typeof setTimeout>;

export function startResourceMonitor() {
	resourceMonitorTimer = setInterval(() => {
		const appMetrics = bridge().electronApp().electronApp().getAppMetrics();
		for (const metric of appMetrics) {
			resourceMetrics[metric.pid] = {
				memory: metric.memory.workingSetSize,
				peakMemory: metric.memory.peakWorkingSetSize,
				cpu: metric.cpu.percentCPUUsage,
			};
		}
	}, 5000);
}

export function stopResourceMonitor() {
	if (!resourceMonitorTimer) return null;
	clearInterval(resourceMonitorTimer);
	return resourceMonitorTimer;
}
