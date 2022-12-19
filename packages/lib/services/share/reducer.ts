import { State as RootState } from '../../reducer';
import { Draft } from 'immer';
import { FolderEntity } from '../database/types';
import { MasterKeyEntity } from '../e2ee/types';

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

export interface StateShareUser {
	id: string;
	status: ShareUserStatus;
	user: StateShareUserUser;
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
}

export interface State {
	shares: StateShare[];
	shareUsers: Record<string, StateShareUser>;
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

export function isSharedFolderOwner(state: RootState, folderId: string): boolean {
	const userId = state.settings['sync.userId'];
	const share = state[stateRootKey].shares.find(s => s.folder_id === folderId);
	if (!share) return false;
	return share.user.id === userId;
}

export function isRootSharedFolder(folder: FolderEntity): boolean {
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
