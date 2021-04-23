import { State as RootState } from '../../reducer';
import { Draft } from 'immer';

interface StateShareUserUser {
	email: string;
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
}

export interface State {
	shares: StateShare[];
	shareUsers: Record<string, StateShareUser[]>;
}

export const stateRootKey = 'shareService';

export const defaultState: State = {
	shares: [],
	shareUsers: {},
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

		}
	} catch (error) {
		error.message = `In share reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
};

export default reducer;
