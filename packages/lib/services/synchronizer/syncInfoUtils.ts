import { FileApi } from '../../file-api';
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

export async function uploadSyncInfo(api: FileApi, syncInfo: SyncInfo) {
	await api.put('info.json', syncInfo.serialize());
}

export function updateSyncInfoCache(syncInfo: SyncInfo) {
	Setting.setValue('syncInfoCache', syncInfo.serialize());
}

export class SyncInfo {

	private version_: number = 0;
	private e2ee_: SyncInfoValueBoolean;
	private activeMasterKeyId_: SyncInfoValueString;
	private masterKeys_: MasterKeyEntity[] = [];
	private updatedTime_: number = 0;

	public serialize(): string {
		return JSON.stringify({
			version: this.version,
			e2ee: this.e2ee,
			activeMasterKeyId: this.activeMasterKeyId,
			masterKeys: this.masterKeys,
			updatedTime: this.updatedTime_,
		});
	}

	public get version(): number {
		return this.version_;
	}

	public set version(v: number) {
		if (v === this.version_) return;

		this.version_ = v;
		this.updatedTime_ = Date.now();
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

}
