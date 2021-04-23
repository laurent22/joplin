import { State as RootState } from '../../reducer';
import { Draft } from 'immer';

interface StateShareUserUser {
	email: string;
	full_name?: string;
}

export interface StateShareUser {
	is_accepted: number;
	user: StateShareUserUser;
}

export interface StateShare {
	id: string;
	type: number;
	folder_id: string;
	note_id: string;
	user?: StateShareUserUser,
}

export interface ShareInvitation {
	share: StateShare;
	is_accepted: number;
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
