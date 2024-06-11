import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import Plugin from '@joplin/lib/services/plugins/Plugin';


export default class MockPluginRunner extends BasePluginRunner {
	public runningPluginIds: string[] = [];
	private onRunningPluginsChangedListeners_ = [() => {}];
	private stopCalledTimes_ = 0;

	public waitForAllToBeRunning(expectedIds: string[]) {
		return new Promise<void>(resolve => {
			const listener = () => {
				let missingIds = false;
				for (const id of expectedIds) {
					if (!this.runningPluginIds.includes(id)) {
						missingIds = true;
						console.warn('Missing ID', id, 'in', this.runningPluginIds);
						break;
					}
				}
				if (!missingIds) {
					this.onRunningPluginsChangedListeners_ = this.onRunningPluginsChangedListeners_.filter(l => l !== listener);
					resolve();
				}
			};
			this.onRunningPluginsChangedListeners_.push(listener);
			listener();
		});
	}

	public get stopCalledTimes() { return this.stopCalledTimes_; }

	public override async run(plugin: Plugin) {
		this.runningPluginIds.push(plugin.manifest.id);

		for (const listener of this.onRunningPluginsChangedListeners_) {
			listener();
		}
	}

	public override async stop(plugin: Plugin) {
		this.runningPluginIds = this.runningPluginIds.filter(id => id !== plugin.manifest.id);
		this.stopCalledTimes_ ++;
	}

	public override async waitForSandboxCalls() {}
}
