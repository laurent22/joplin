import { State as RootState } from '../../reducer';
import { Draft } from 'immer';
import { FolderEntity } from '../database/types';
import { MasterKeyEntity } from '../e2ee/types';
import Logger from '../../Logger';

const logger = Logger.create('share/reducer');

interface StateShareUserUser {
	id: string;
	email: string;
	full_name?: string;
}

export enum ShareUserStatus {
	Waiting = 0,
	Accepted = 1,
	Rejected = 2,
}

export interface SharePermissions {
	can_read: number;
	can_write: number;
}

export interface StateShareUser {
	id: string;
	status: ShareUserStatus;
	user: StateShareUserUser;
	can_read: number;
	can_write: number;
}

export interface StateShare {
	id: string;
	type: number;
	folder_id: string;
	note_id: string;
	master_key_id: string;
	user?: StateShareUserUser;
}

export interface ShareInvitation {
	id: string;
	master_key: MasterKeyEntity;
	share: StateShare;
	status: ShareUserStatus;
	can_read: number;
	can_write: number;
}

export interface State {
	shares: StateShare[];
	shareUsers: Record<string, StateShareUser[]>;
	shareInvitations: ShareInvitation[];
	processingShareInvitationResponse: boolean;
}

export const stateRootKey = 'shareService';

export const defaultState: State = {
	shares: [],
	shareUsers: {},
	shareInvitations: [],
	processingShareInvitationResponse: false,
};

export const parseShareCache = (serialized: string): State => {
	let raw: any = {};
	try {
		raw = JSON.parse(serialized);
		if (!raw) raw = {};
	} catch (error) {
		logger.info('Could not load share cache from settings - will return a default value. Error was:', error);
	}

	return {
		shares: raw.shares || [],
		shareUsers: raw.shareUsers || {},
		shareInvitations: raw.shareInvitations || [],
		processingShareInvitationResponse: false,
	};
};

export const readFromSettings = (state: RootState): State => {
	return parseShareCache(state.settings['sync.shareCache']);
};

export function isSharedFolderOwner(state: RootState, folderId: string): boolean {
	const userId = state.settings['sync.userId'];
	const share = state[stateRootKey].shares.find(s => s.folder_id === folderId);
	if (!share) return false;
	return share.user.id === userId;
}

export function isRootSharedFolder(folder: FolderEntity): boolean {
	if (!('share_id' in folder) || !('parent_id' in folder)) throw new Error('share_id and parent_id must be present');
	return !!folder.share_id && !folder.parent_id;
}

const reducer = (draftRoot: Draft<RootState>, action: any) => {
	if (action.type.indexOf('SHARE_') !== 0) return;

	const draft = draftRoot.shareService;

	try {
		switch (action.type) {

		case 'SHARE_SET':

			draft.shares = action.shares;
			break;

		case 'SHARE_USER_SET':

			draft.shareUsers[action.shareId] = action.shareUsers;
			break;

		case 'SHARE_USER_UPDATE_ONE':

			{
				const shareUser = (draft.shareUsers as any)[action.shareId].find((su: StateShareUser) => su.id === action.shareUser.id);
				if (!shareUser) throw new Error(`No such user: ${JSON.stringify(action)}`);

				for (const [name, value] of Object.entries(action.shareUser)) {
					shareUser[name] = value;
				}
			}
			break;

		case 'SHARE_INVITATION_SET':

			draft.shareInvitations = action.shareInvitations;
			break;

		case 'SHARE_INVITATION_RESPONSE_PROCESSING':

			draft.processingShareInvitationResponse = action.value;
			break;

		}
	} catch (error) {
		error.message = `In share reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
};

export default reducer;
