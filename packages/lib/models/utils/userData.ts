import { ModelType } from '../../BaseModel';
import { FolderEntity, NoteEntity, ResourceEntity, TagEntity, UserData, UserDataValue } from '../../services/database/types';
import Note from '../Note';
import Folder from '../Folder';
import Resource from '../Resource';
import Tag from '../Tag';
import BaseItem from '../BaseItem';
import { LoadOptions } from './types';

const maxKeyLength = 255;

type SupportedEntity = NoteEntity | ResourceEntity | FolderEntity | TagEntity;

const unserializeUserData = (s: string): UserData => {
	if (!s) return {};

	try {
		const r = JSON.parse(s);
		return r as UserData;
	} catch (error) {
		error.message = `Could not unserialize user data: ${error.message}: ${s}`;
		throw error;
	}
};

const serializeUserData = (d: UserData): string => {
	if (!d) return '';
	return JSON.stringify(d);
};

export const setUserData = <T>(userData: UserData, namespace: string, key: string, value: T, deleted = false): UserData => {
	if (key.length > maxKeyLength) new Error(`Key must no be longer than ${maxKeyLength} characters`);
	if (!(namespace in userData)) userData[namespace] = {};
	if (key in userData[namespace] && userData[namespace][key].v === value) return userData;

	const newUserDataValue: UserDataValue = {
		v: value,
		t: Date.now(),
	};

	if (deleted) newUserDataValue.d = 1;

	return {
		...userData,
		[namespace]: {
			...userData[namespace],
			[key]: newUserDataValue,
		},
	};
};

export const getUserData = <T>(userData: UserData, namespace: string, key: string): T|undefined => {
	if (!hasUserData(userData, namespace, key)) return undefined;
	return userData[namespace][key].v as T;
};

const checkIsSupportedItemType = (itemType: ModelType) => {
	if (![ModelType.Note, ModelType.Folder, ModelType.Tag, ModelType.Resource].includes(itemType)) {
		throw new Error(`Unsupported item type: ${itemType}`);
	}
};

export const setItemUserData = async <T>(itemType: ModelType, itemId: string, namespace: string, key: string, value: T, deleted = false): Promise<SupportedEntity> => {
	checkIsSupportedItemType(itemType);

	interface ItemSlice {
		user_data: string;
		updated_time?: number;
		id?: string;
		parent_id?: string;
	}

	const options: LoadOptions = { fields: ['user_data'] };
	if (itemType === ModelType.Note) (options.fields as string[]).push('parent_id');

	const item = await BaseItem.loadItem(itemType, itemId, options) as ItemSlice;

	const userData = unserializeUserData(item.user_data);
	const newUserData = setUserData(userData, namespace, key, value, deleted);

	const itemToSave: ItemSlice = {
		id: itemId,
		user_data: serializeUserData(newUserData),
		updated_time: Date.now(),
	};

	if (itemType === ModelType.Note) itemToSave.parent_id = item.parent_id;

	const saveOptions: any = { autoTimestamp: false };

	if (itemType === ModelType.Note) return Note.save(itemToSave, saveOptions);
	if (itemType === ModelType.Folder) return Folder.save(itemToSave, saveOptions);
	if (itemType === ModelType.Resource) return Resource.save(itemToSave, saveOptions);
	if (itemType === ModelType.Tag) return Tag.save(itemToSave, saveOptions);

	throw new Error('Unreachable');
};

// Deprecated - don't use
export const setNoteUserData = async <T>(note: NoteEntity, namespace: string, key: string, value: T, deleted = false): Promise<NoteEntity> => {
	return setItemUserData(ModelType.Note, note.id, namespace, key, value, deleted);
};

const hasUserData = (userData: UserData, namespace: string, key: string) => {
	if (!(namespace in userData)) return false;
	if (!(key in userData[namespace])) return false;
	if (userData[namespace][key].d) return false;
	return true;
};

export const getItemUserData = async <T>(itemType: ModelType, itemId: string, namespace: string, key: string): Promise<T|undefined> => {
	checkIsSupportedItemType(itemType);

	interface ItemSlice {
		user_data: string;
	}

	const item = await BaseItem.loadItem(itemType, itemId, { fields: ['user_data'] }) as ItemSlice;
	const userData = unserializeUserData(item.user_data);
	return getUserData(userData, namespace, key);
};

// Deprecated - don't use
export const getNoteUserData = async <T>(note: NoteEntity, namespace: string, key: string): Promise<T|undefined> => {
	return getItemUserData<T>(ModelType.Note, note.id, namespace, key);
};

export const deleteItemUserData = async (itemType: ModelType, itemId: string, namespace: string, key: string): Promise<SupportedEntity> => {
	return setItemUserData(itemType, itemId, namespace, key, 0, true);
};

// Deprecated - don't use
export const deleteNoteUserData = async (note: NoteEntity, namespace: string, key: string): Promise<NoteEntity> => {
	return setNoteUserData(note, namespace, key, 0, true);
};

export const mergeUserData = (target: UserData, source: UserData): UserData => {
	const output: UserData = { ...target };

	for (const namespaceName of Object.keys(source)) {
		if (!(namespaceName in output)) output[namespaceName] = source[namespaceName];
		const namespace = source[namespaceName];
		for (const [key, value] of Object.entries(namespace)) {
			// Keep ours
			if (output[namespaceName][key] && output[namespaceName][key].t >= value.t) continue;

			// Use theirs
			output[namespaceName][key] = {
				...value,
			};
		}
	}

	return output;
};
