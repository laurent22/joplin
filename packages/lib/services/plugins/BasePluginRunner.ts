import Plugin from './Plugin';
import BaseService from '../BaseService';
import Global from './api/Global';

export default abstract class BasePluginRunner extends BaseService {

	// A dictionary with the plugin ID as key. Then each entry has a list
	// of timestamp/call counts.
	//
	// 'org.joplinapp.plugins.ExamplePlugin': {
	//     1650375620: 5,    // 5 calls at second 1650375620
	//     1650375621: 19,   // 19 calls at second 1650375621
	//     1650375623: 12,
	// },
	// 'org.joplinapp.plugins.AnotherOne': {
	//     1650375620: 1,
	//     1650375623: 4,
	// };
	private callStats_: Record<string, Record<number, number>> = {};

	public async run(plugin: Plugin, sandbox: Global): Promise<void> {
		throw new Error(`Not implemented: ${plugin} / ${sandbox}`);
	}

	public async waitForSandboxCalls(): Promise<void> {
		throw new Error('Not implemented: waitForSandboxCalls');
	}

	protected recordCallStat(pluginId: string) {
		const timeSeconds = Math.floor(Date.now() / 1000);
		if (!this.callStats_[pluginId]) this.callStats_[pluginId] = {};
		if (!this.callStats_[pluginId][timeSeconds]) this.callStats_[pluginId][timeSeconds] = 0;
		this.callStats_[pluginId][timeSeconds]++;
	}

	// Duration in seconds
	public callStatsSummary(pluginId: string, duration: number): number[] {
		const output: number[] = [];

		const startTime = Math.floor(Date.now() / 1000 - duration);
		const endTime = startTime + duration;

		for (let t = startTime; t <= endTime; t++) {
			const callCount = this.callStats_[pluginId][t];
			output.push(callCount ? callCount : 0);
		}

		return output;
	}

}
