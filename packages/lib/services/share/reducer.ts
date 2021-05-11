import { State as RootState } from '../../reducer';
import { Draft } from 'immer';

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
	user?: StateShareUserUser;
}

export interface ShareInvitation {
	id: string;
	share: StateShare;
	status: ShareUserStatus;
}

export interface State {
	shares: StateShare[];
	shareUsers: Record<string, StateShareUser>;
	shareInvitations: ShareInvitation[];
}

export const stateRootKey = 'shareService';

export const defaultState: State = {
	shares: [],
	shareUsers: {},
	shareInvitations: [],
};

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

		}
	} catch (error) {
		error.message = `In share reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
};

export default reducer;
