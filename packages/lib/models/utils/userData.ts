import { NoteEntity, NoteUserData, NoteUserDataValue } from '../../services/database/types';
import Note from '../Note';

const unserializeUserData = (s: string): NoteUserData => {
	if (!s) return {};

	try {
		const r = JSON.parse(s);
		return r as NoteUserData;
	} catch (error) {
		error.message = `Could not unserialize user data: ${error.message}: ${s}`;
		throw error;
	}
};

const serializeUserData = (d: NoteUserData): string => {
	if (!d) return '';
	return JSON.stringify(d);
};

export const setUserData = <T>(userData: NoteUserData, namespace: string, key: string, value: T, deleted: boolean = false): NoteUserData => {
	if (!(namespace in userData)) userData[namespace] = {};
	if (key in userData[namespace] && userData[namespace][key].v === value) return userData;

	const newUserDataValue: NoteUserDataValue = {
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

export const getUserData = <T>(userData: NoteUserData, namespace: string, key: string): T|undefined => {
	if (!hasUserData(userData, namespace, key)) return undefined;
	return userData[namespace][key].v as T;
};

export const setNoteUserData = async <T>(note: NoteEntity, namespace: string, key: string, value: T, deleted: boolean = false): Promise<NoteEntity> => {
	if (!('user_data' in note) || !('parent_id' in note)) throw new Error(`Missing user_data or parent_id property when trying to access ${namespace}:${key}`);

	const userData = unserializeUserData(note.user_data);
	const newUserData = setUserData(userData, namespace, key, value, deleted);

	return Note.save({
		id: note.id,
		parent_id: note.parent_id,
		user_data: serializeUserData(newUserData),
		updated_time: Date.now(),
	}, {
		autoTimestamp: false,
	});
};

const hasUserData = (userData: NoteUserData, namespace: string, key: string) => {
	if (!(namespace in userData)) return false;
	if (!(key in userData[namespace])) return false;
	if (userData[namespace][key].d) return false;
	return true;
};

export const getNoteUserData = <T>(note: NoteEntity, namespace: string, key: string): T|undefined => {
	if (!('user_data' in note)) throw new Error(`Missing user_data property when trying to access ${namespace}:${key}`);
	const userData = unserializeUserData(note.user_data);
	return getUserData(userData, namespace, key);
};

export const deleteNoteUserData = async (note: NoteEntity, namespace: string, key: string): Promise<NoteEntity> => {
	return setNoteUserData(note, namespace, key, 0, true);
};

export const mergeUserData = (target: NoteUserData, source: NoteUserData): NoteUserData => {
	const output: NoteUserData = { ...target };

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
