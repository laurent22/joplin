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

	await saveLocalSyncInfo(syncInfo);
}

export async function uploadSyncInfo(api: FileApi, syncInfo: SyncInfo) {
	await api.put('info.json', syncInfo.serialize());
}

export async function fetchSyncInfo(api: FileApi): Promise<SyncInfo> {
	const r: string = await api.get('info.json');
	return new SyncInfo(r);
}

export function saveLocalSyncInfo(syncInfo: SyncInfo) {
	Setting.setValue('syncInfoCache', syncInfo.serialize());
}

export function localSyncInfo(): SyncInfo {
	return new SyncInfo(Setting.value('syncInfoCache'));
}

export function mergeSyncInfos(s1: SyncInfo, s2: SyncInfo): SyncInfo {
	const output: SyncInfo = new SyncInfo();

	output.e2ee = s1.keyTimestamp('e2ee') > s2.keyTimestamp('e2ee') ? s1.e2ee : s2.e2ee;
	output.activeMasterKeyId = s1.keyTimestamp('activeMasterKeyId') > s2.keyTimestamp('activeMasterKeyId') ? s1.activeMasterKeyId : s2.activeMasterKeyId;
	output.version = s1.version > s2.version ? s1.version : s2.version;

	output.masterKeys = s1.masterKeys.slice();

	for (const mk of s2.masterKeys) {
		const idx = output.masterKeys.findIndex(m => m.id === mk.id);
		if (idx < 0) {
			output.masterKeys.push(mk);
		} else {
			const mk2 = output.masterKeys[idx];
			output.masterKeys[idx] = mk.updated_time > mk2.updated_time ? mk : mk2;
		}
	}

	return output;
}

export function syncInfoEquals(s1: SyncInfo, s2: SyncInfo): boolean {
	return s1.serialize() === s2.serialize();
}

export class SyncInfo {

	private version_: number = 0;
	private e2ee_: SyncInfoValueBoolean;
	private activeMasterKeyId_: SyncInfoValueString;
	private masterKeys_: MasterKeyEntity[] = [];

	public constructor(serialized: string = null) {
		this.e2ee_ = { value: false, updatedTime: 0 };
		this.activeMasterKeyId_ = { value: '', updatedTime: 0 };

		if (serialized) this.load(serialized);
	}

	public toObject(): any {
		return {
			version: this.version,
			e2ee: this.e2ee_,
			activeMasterKeyId: this.activeMasterKeyId_,
			masterKeys: this.masterKeys,
		};
	}

	public serialize(): string {
		return JSON.stringify(this.toObject());
	}

	public load(serialized: string) {
		const s: any = JSON.parse(serialized);
		this.version = 'version' in s ? s.version : 0;
		this.e2ee_ = 'e2ee' in s ? s.e2ee : { value: false, updatedTime: 0 };
		this.activeMasterKeyId_ = 'activeMasterKeyId' in s ? s.activeMasterKeyId : { value: '', updatedTime: 0 };
		this.masterKeys_ = 'masterKeys' in s ? s.masterKeys : [];
	}

	public get version(): number {
		return this.version_;
	}

	public set version(v: number) {
		if (v === this.version_) return;

		this.version_ = v;
	}

	public get e2ee(): boolean {
		return this.e2ee_.value;
	}

	public set e2ee(v: boolean) {
		if (v === this.e2ee) return;

		this.e2ee_ = { value: v, updatedTime: Date.now() };
	}

	public get activeMasterKeyId(): string {
		return this.activeMasterKeyId_.value;
	}

	public set activeMasterKeyId(v: string) {
		if (v === this.activeMasterKeyId) return;

		this.activeMasterKeyId_ = { value: v, updatedTime: Date.now() };
	}

	public get masterKeys(): MasterKeyEntity[] {
		return this.masterKeys_;
	}

	public set masterKeys(v: MasterKeyEntity[]) {
		if (JSON.stringify(v) === JSON.stringify(this.masterKeys_)) return;

		this.masterKeys_ = v;
	}

	public keyTimestamp(name: string): number {
		const v: any = (this as any)[`${name}_`];
		if (!v) throw new Error(`Invalid name: ${name}`);
		return v.updateTime;
	}

	public setKeyTimestamp(name: string, timestamp: number) {
		const v: any = (this as any)[`${name}_`];
		if (!v) throw new Error(`Invalid name: ${name}`);
		v.updatedTime = timestamp;
	}

}

// ---------------------------------------------------------
// Shortcuts to simplify the refactoring
// ---------------------------------------------------------

export function getEncryptionEnabled() {
	return localSyncInfo().e2ee;
}

export function setEncryptionEnabled(v: boolean, activeMasterKeyId: string = '') {
	const s = localSyncInfo();
	s.e2ee = v;
	if (activeMasterKeyId) s.activeMasterKeyId = activeMasterKeyId;
	saveLocalSyncInfo(s);
}

export function getActiveMasterKeyId() {
	return localSyncInfo().activeMasterKeyId;
}

export function setActiveMasterKeyId(id: string) {
	const s = localSyncInfo();
	s.activeMasterKeyId = id;
	saveLocalSyncInfo(s);
}

export function getActiveMasterKey(s: SyncInfo = null): MasterKeyEntity | null {
	s = s || localSyncInfo();
	if (!s.activeMasterKeyId) return null;
	return s.masterKeys.find(mk => mk.id === s.activeMasterKeyId);
}
