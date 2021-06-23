import { FileApi } from '../../file-api';

interface SyncTargetInfo {
	version: number;
}

export default class SyncTargetInfoHandler {

	private api_: FileApi = null;
	private info_: SyncTargetInfo = null;

	public constructor(api: FileApi) {
		this.api_ = api;
	}

	public async info(): Promise<SyncTargetInfo> {
		if (this.info_) return this.info_;
		this.info_ = await this.fetchSyncTargetInfo();
		return this.info_;
	}

	private serializeSyncTargetInfo(info: SyncTargetInfo): string {
		return JSON.stringify(info);
	}

	private unserializeSyncTargetInfo(info: string): SyncTargetInfo {
		return JSON.parse(info);
	}

	public async setInfo(info: SyncTargetInfo): Promise<void> {
		this.info_ = info;
		await this.api_.put('info.json', this.serializeSyncTargetInfo(info));
	}

	private async fetchSyncTargetInfo(): Promise<SyncTargetInfo> {
		const syncTargetInfoText = await this.api_.get('info.json');

		// Returns version 0 if the sync target is empty
		let output: SyncTargetInfo = { version: 0 };

		if (syncTargetInfoText) {
			output = this.unserializeSyncTargetInfo(syncTargetInfoText);
			if (!output.version) throw new Error('Missing "version" field in info.json');
		} else {
			const oldVersion = await this.api_.get('.sync/version.txt');
			if (oldVersion) output = { version: 1 };
		}

		return output;
	}

}
