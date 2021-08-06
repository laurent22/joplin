import { FileApi } from '../../file-api';
import JoplinDatabase from '../../JoplinDatabase';
import Setting from '../../models/Setting';
import { MasterKeyEntity } from '../database/types';

export interface SyncInfoValueBoolean {
	value: boolean;
	updatedTime: number;
}

export interface SyncInfoValueString {
	value: string;
	updatedTime: number;
}

export async function migrateLocalSyncInfo(db: JoplinDatabase) {
	if (Setting.value('syncInfoCache')) return; // Already initialized

	// TODO: if the sync info is changed, there should be steps to migrate from
	// v3 to v4, v4 to v5, etc.

	const masterKeys = await db.selectAll('SELECT * FROM master_keys');

	const masterKeyMap: Record<string, any> = {};
	for (const mk of masterKeys) masterKeyMap[mk.id] = mk;

	const syncInfo = new SyncInfo();
	syncInfo.version = Setting.value('syncVersion');
	syncInfo.e2ee = Setting.valueNoThrow('encryption.enabled', false);
	syncInfo.activeMasterKeyId = Setting.valueNoThrow('encryption.activeMasterKeyId', '');
	syncInfo.masterKeys = masterKeys;

	// We set the timestamp to 0 because we don't know when the source setting
	// has been set. That way, if the parameter is changed later on in any
	// client, the new value will have higher priority. This is to handle this
	// case:
	//
	// - Client 1 upgrade local sync target info (with E2EE = false)
	// - Client 1 set E2EE to true
	// - Client 2 upgrade local sync target info (with E2EE = false)
	// - => If we don't set the timestamp to 0, the local value of client 2 will
	//   have a higher timestamp and E2EE will get disabled, even though this is
	//   most likely not what the user wants.
	syncInfo.setKeyTimestamp('e2ee', 0);
	syncInfo.setKeyTimestamp('activeMasterKeyId', 0);
	syncInfo.updatedTime = 0;

	await updateLocalSyncInfo(syncInfo);
}

export async function uploadSyncInfo(api: FileApi, syncInfo: SyncInfo) {
	await api.put('info.json', syncInfo.serialize());
}

export function updateLocalSyncInfo(syncInfo: SyncInfo) {
	Setting.setValue('syncInfoCache', syncInfo.serialize());
}

export function localSyncInfo(): SyncInfo {
	const s = new SyncInfo();
	s.load(Setting.value('syncInfoCache'));
	return s;
}

export class SyncInfo {

	private version_: number = 0;
	private e2ee_: SyncInfoValueBoolean;
	private activeMasterKeyId_: SyncInfoValueString;
	private masterKeys_: MasterKeyEntity[] = [];
	private updatedTime_: number = 0;

	public constructor() {
		this.e2ee_ = { value: false, updatedTime: 0 };
		this.activeMasterKeyId_ = { value: '', updatedTime: 0 };
		this.updatedTime_ = 0;
	}

	public serialize(): string {
		return JSON.stringify({
			version: this.version,
			e2ee: this.e2ee_,
			activeMasterKeyId: this.activeMasterKeyId_,
			masterKeys: this.masterKeys,
			updatedTime: this.updatedTime_,
		});
	}

	public load(serialized: string) {
		const s: any = JSON.stringify(serialized);
		this.version = s.version;
		this.e2ee_ = s.e2ee;
		this.activeMasterKeyId_ = s.masterKeyId;
		this.updatedTime_ = s.updatedTime;
		this.masterKeys_ = s.masterKeys;
	}

	public get version(): number {
		return this.version_;
	}

	public set version(v: number) {
		if (v === this.version_) return;

		this.version_ = v;
		this.updatedTime_ = Date.now();
	}

	public get updatedTime(): number {
		return this.updatedTime_;
	}

	public set updatedTime(v: number) {
		if (v === this.updatedTime_) return;
		this.updatedTime_ = v;
	}

	public get e2ee(): boolean {
		return this.e2ee_.value;
	}

	public set e2ee(v: boolean) {
		if (v === this.e2ee) return;

		this.e2ee_ = { value: v, updatedTime: Date.now() };
		this.updatedTime_ = Date.now();
	}

	public get activeMasterKeyId(): string {
		return this.activeMasterKeyId_.value;
	}

	public set activeMasterKeyId(v: string) {
		if (v === this.activeMasterKeyId) return;

		this.activeMasterKeyId_ = { value: v, updatedTime: Date.now() };
		this.updatedTime_ = Date.now();
	}

	public get masterKeys(): MasterKeyEntity[] {
		return this.masterKeys_;
	}

	public set masterKeys(v: MasterKeyEntity[]) {
		if (JSON.stringify(v) === JSON.stringify(this.masterKeys_)) return;

		this.masterKeys_ = v;
		this.updatedTime_ = Date.now();
	}

	public setKeyTimestamp(name: string, timestamp: number) {
		(this as any)[`${name}_`].updatedTime = timestamp;
	}

}

// ---------------------------------------------------------
// Shortcuts to simplify the refactoring
// ---------------------------------------------------------

// export function encryptionEnabled() {
// 	return localSyncInfo().e2ee;
// }
