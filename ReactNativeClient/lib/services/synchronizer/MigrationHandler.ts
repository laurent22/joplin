import LockHandler, { LockType } from './LockHandler';

const migrations = [
	null,
	null,
	require('./migrations/2.js').default,
];

const Setting = require('lib/models/Setting');
const { sprintf } = require('sprintf-js');
const JoplinError = require('lib/JoplinError');

interface SyncTargetInfo {
	version: number,
}

export default class MigrationHandler {

	private api_:any = null;
	private lockHandler_:LockHandler = null;
	private clientType_:string;
	private clientId_:string;

	constructor(api:any, lockHandler:LockHandler, clientType:string, clientId:string) {
		this.api_ = api;
		this.lockHandler_ = lockHandler;
		this.clientType_ = clientType;
		this.clientId_ = clientId;
	}

	public async fetchSyncTargetInfo() {
		const syncTargetInfoText = await this.api_.get('info.json');

		const output:SyncTargetInfo = syncTargetInfoText ? JSON.parse(syncTargetInfoText) : {
			version: 1,
		};

		if (!output.version) throw new Error('Missing "version" field in info.json');

		return output;
	}

	private serializeSyncTargetInfo(info:SyncTargetInfo) {
		return JSON.stringify(info);
	}

	async checkCanSync() {
		const supportedSyncTargetVersion = Setting.value('syncVersion');
		const syncTargetInfo = await this.fetchSyncTargetInfo();

		if (syncTargetInfo.version > supportedSyncTargetVersion) {
			throw new JoplinError(sprintf('Sync version of the target (%d) is greater than the version supported by the client (%d). Please upgrade your client.', syncTargetInfo.version, supportedSyncTargetVersion), 'outdatedClient');
		} else if (syncTargetInfo.version < supportedSyncTargetVersion) {
			throw new JoplinError(sprintf('Sync version of the target (%d) is lower than the version supported by the client (%d). Please upgrade the sync target.', syncTargetInfo.version, supportedSyncTargetVersion), 'outdatedSyncTarget');
		}
	}

	async upgrade(targetVersion:number = 0) {
		const supportedSyncTargetVersion = Setting.value('syncVersion');
		const syncTargetInfo = await this.fetchSyncTargetInfo();

		if (syncTargetInfo.version > supportedSyncTargetVersion) {
			throw new JoplinError(sprintf('Sync version of the target (%d) is greater than the version supported by the client (%d). Please upgrade your client.', syncTargetInfo.version, supportedSyncTargetVersion), 'outdatedClient');
		}

		// TODO: refresh lock every x min
		await this.lockHandler_.acquireLock(LockType.Exclusive, this.clientType_, this.clientId_, 1000 * 30);

		try {
			for (let newVersion = syncTargetInfo.version + 1; newVersion < migrations.length; newVersion++) {
				if (targetVersion && newVersion > targetVersion) break;

				const migration = migrations[newVersion];
				if (!migration) continue;

				await migration(this.api_);

				await this.api_.put('info.json', this.serializeSyncTargetInfo({
					...syncTargetInfo,
					version: newVersion,
				}));
			}
		} finally {
			await this.lockHandler_.releaseLock(LockType.Exclusive, this.clientType_, this.clientId_);
		}
	}

}
