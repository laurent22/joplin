import { FileApi } from '../../file-api';
// import Logger from '../../Logger';
import Setting from '../../models/Setting';
import uuid from '../../uuid';
import { MasterKeyEntity } from '../database/types';
const ArrayUtils = require('../../ArrayUtils');

// const logger = Logger.create('SyncTargetInfoHandler');

export interface SyncTargetInfo {
	version: number;
	e2ee: boolean;
	updatedTime: number;
	masterKeys: Record<string, MasterKeyEntity>;
	activeMasterKeyId: string;
}

function serializeSyncTargetInfo(info: SyncTargetInfo): string {
	return JSON.stringify(info, null, '\t');
}

function unserializeSyncTargetInfo(info: string): SyncTargetInfo {
	return JSON.parse(info);
}

function defaultSyncTargetInfo(): SyncTargetInfo {
	return {
		e2ee: false,
		activeMasterKeyId: '',
		masterKeys: {},
		version: 0,
		updatedTime: 0,
	};
}

export function setLocalSyncTargetInfo(info: SyncTargetInfo) {
	Setting.setValue('sync.info', serializeSyncTargetInfo(info));
}

export function localSyncTargetInfo(settingInfo: string = null): SyncTargetInfo | null {
	const info = settingInfo || Setting.value('sync.info');
	return info ? unserializeSyncTargetInfo(info) : defaultSyncTargetInfo();
}

// function latestMasterKey(info:SyncTargetInfo):MasterKeyEntity {
// 	if (!('masterKeys' in info)) return null;
// 	if (!Object.keys(info.masterKeys).length) return null;

// 	let output:MasterKeyEntity = null;
// 	for (let [_id, mk] of Object.entries(info.masterKeys)) {
// 		if (!output || mk.updated_time > output.updated_time) {
// 			output = mk;
// 		}
// 	}
// 	return output;
// }

function validateInfo(info: SyncTargetInfo): SyncTargetInfo {
	if (!('version' in info)) throw new Error(`Missing "version" field in info.json: ${JSON.stringify(info)}`);

	// if ('masterKeys' in info && Object.keys(info.masterKeys).length && !info.activeMasterKeyId) {
	// 	throw new Error('Master keys are
	// }

	// info = { ...info };

	// if ('masterKeys' in info && Object.keys(info.masterKeys).length && !info.activeMasterKeyId) {
	// 	const latestMk = latestMasterKey(info);
	// 	info.activeMasterKeyId = latestMk.id;
	// }

	return info;
}

export function syncTargetInfoEquals(info1: SyncTargetInfo, info2: SyncTargetInfo): boolean {
	if (info1.e2ee !== info2.e2ee) return false;
	if (info1.version !== info2.version) return false;

	const mks1 = info1.masterKeys || {};
	const mks2 = info2.masterKeys || {};

	if (Object.keys(mks1).length !== Object.keys(mks2).length) return false;

	for (const [id, mk1] of Object.entries(mks1)) {
		const mk2 = mks2[id];
		if (!mk2) return false;

		if (mk1.updated_time !== mk2.updated_time) return false;
	}

	return true;
}

// Merges info2 into info1.
export function mergeSyncTargetInfos(info1: SyncTargetInfo, info2: SyncTargetInfo): SyncTargetInfo {
	info1 = {
		...defaultSyncTargetInfo(),
		...info1,
	};

	info2 = {
		...defaultSyncTargetInfo(),
		...info2,
	};

	const baseInfo = info1.updatedTime > info2.updatedTime ? info1 : info2;

	const newInfo: SyncTargetInfo = { ...baseInfo };

	const masterKeyIds = ArrayUtils.unique(
		Object.keys(info1.masterKeys ? info1.masterKeys : {}).concat(
			Object.keys(info2.masterKeys ? info2.masterKeys : {})
		)
	);

	const mergedMasterKeys: Record<string, MasterKeyEntity> = {};

	for (const id of masterKeyIds) {
		const mk1 = info1.masterKeys[id] || { updated_time: 0 };
		const mk2 = info2.masterKeys[id] || { updated_time: 0 };
		mergedMasterKeys[id] = mk1.updated_time > mk2.updated_time ? mk1 : mk2;
	}

	newInfo.masterKeys = mergedMasterKeys;
	return newInfo;
}

export async function remoteSyncTargetInfo(api: FileApi): Promise<SyncTargetInfo> {
	const syncTargetInfoText = await api.get('info.json');

	const defaultFields: SyncTargetInfo = {
		version: 0,
		e2ee: false,
		updatedTime: 0,
		masterKeys: {},
		activeMasterKeyId: '',
	};

	// Returns version 0 if the sync target is empty
	let output: SyncTargetInfo = defaultFields;

	if (syncTargetInfoText) {
		output = unserializeSyncTargetInfo(syncTargetInfoText);
		output = validateInfo(output);
	} else {
		const oldVersion = await api.get('.sync/version.txt');
		if (oldVersion) output = { ...defaultFields, version: 1 };
	}

	return output;
}

export async function setRemoteSyncTargetInfo(api: FileApi, info: SyncTargetInfo) {
	await api.put('info.json', serializeSyncTargetInfo(info));
}

// -----------------------------------------------------------------------
// Utility functions to manipulate the SyncTargetInfo data
// -----------------------------------------------------------------------

export function activeMasterKey(info: SyncTargetInfo): MasterKeyEntity {
	if (!info.activeMasterKeyId) return null;

	// Sanity check - but shouldn't happen because the key is saved at the same
	// time as the active master key is set.
	if (!info.masterKeys[info.activeMasterKeyId]) throw new Error('Active master key is not present in info.json');

	return info.masterKeys[info.activeMasterKeyId];
}

export function activeMasterKeyId(info: SyncTargetInfo = null) {
	info = info || localSyncTargetInfo();
	return info.activeMasterKeyId;
}

export function setActiveMasterKeyId(id: string) {
	const info = localSyncTargetInfo();
	if (info.activeMasterKeyId === id) return;

	setLocalSyncTargetInfo({
		...localSyncTargetInfo(),
		activeMasterKeyId: id,
		updatedTime: Date.now(),
	});
}

export function setEncryptionEnabled(enable: boolean = true, activeMasterKeyId: string = null) {
	const info = localSyncTargetInfo();
	if (info.e2ee === enable) return;

	const newInfo = {
		...info,
		e2ee: enable,
		updatedTime: Date.now(),
	};

	if (activeMasterKeyId !== null) newInfo.activeMasterKeyId = activeMasterKeyId;

	setLocalSyncTargetInfo(newInfo);
}

export function encryptionEnabled(info: SyncTargetInfo = null) {
	info = info || localSyncTargetInfo();
	return info.e2ee;
}

export function encryptionDisabled(info: SyncTargetInfo = null) {
	return !encryptionEnabled(info);
}

export function masterKeyById(id: string): MasterKeyEntity {
	return localSyncTargetInfo().masterKeys[id];
}

// This function should not be used directly - instead use MasterKey.save(),
// which will call this function and dispatch a Redux action.
export function saveMasterKey(mk: MasterKeyEntity): MasterKeyEntity {
	const info = localSyncTargetInfo();

	const id = mk.id ? mk.id : uuid.create();

	const newMasterKey = {
		id,
		...info.masterKeys[id],
		...mk,
	};

	setLocalSyncTargetInfo({
		...info,
		masterKeys: {
			...info.masterKeys,
			[newMasterKey.id]: newMasterKey,
		},
		updatedTime: Date.now(),
	});

	return newMasterKey;
}

export function masterKeyAll(info: SyncTargetInfo = null): MasterKeyEntity[] {
	info = info || localSyncTargetInfo();
	const masterKeys = info.masterKeys;
	return Object.keys(masterKeys).map(id => masterKeys[id]);
}
