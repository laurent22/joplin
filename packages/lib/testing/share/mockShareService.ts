import { Store, createStore } from 'redux';
import reducer, { State, defaultState } from '../../reducer';
import ShareService from '../../services/share/ShareService';
import { encryptionService } from '../test-utils';
import JoplinServerApi, { ExecOptions } from '../../JoplinServerApi';
import { ShareInvitation, StateShare, StateShareUser } from '../../services/share/reducer';

const testReducer = (state = defaultState, action: unknown) => {
	return reducer(state, action);
};

interface ShareStateResponse {
	items: Partial<StateShare>[];
}
interface ShareInvitationResponse {
	items: Partial<ShareInvitation>[];
}
interface ShareUsersResponse {
	items: Partial<StateShareUser>[];
}

type Json = Record<string, unknown>;
type OnShareGetListener = (query: Json)=> Promise<ShareStateResponse>;
type OnSharePostListener = (query: Json)=> Promise<{ id: string }>;
type OnInvitationGetListener = (query: Json)=> Promise<ShareInvitationResponse>;
type OnShareUsersGetListener = (shareId: string)=> Promise<ShareUsersResponse>;
type OnShareUsersPostListener = (shareId: string, body: Json)=> Promise<void>;

type OnApiExecListener = (
	method: string,
	path: string,
	query: Json,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needs to interface with old code from before the rule was applied
	body: any,
	headers: Record<string, unknown>,
	options: ExecOptions
)=> Promise<unknown>;

export type ApiMock = {
	getShares: OnShareGetListener;
	postShares: OnSharePostListener;
	getShareInvitations: OnInvitationGetListener;
	getShareUsers?: OnShareUsersGetListener;
	postShareUsers?: OnShareUsersPostListener;
	onUnhandled?: OnApiExecListener;

	onExec?: undefined;
}|{
	onExec: OnApiExecListener;

	onUnhandled?: undefined;
	getShareInvitations?: undefined;
	getShares?: undefined;
	postShares?: undefined;
	getShareUsers?: undefined;
	postShareUsers?: undefined;
};

// Initializes a share service with mocks
const mockShareService = (apiCallHandler: ApiMock, service?: ShareService, store?: Store<State>) => {
	service ??= new ShareService();
	const api: Partial<JoplinServerApi> = {
		exec: (method, path = '', query = null, body = null, headers = null, options = null) => {
			if (apiCallHandler.onExec) {
				return apiCallHandler.onExec(method, path, query, body, headers, options);
			}
			if (path === 'api/shares') {
				if (method === 'GET') {
					return apiCallHandler.getShares(query);
				} else if (method === 'POST') {
					return apiCallHandler.postShares(query);
				}
			} else if (method === 'GET' && path === 'api/share_users') {
				return apiCallHandler.getShareInvitations(query);
			}

			const shareUsersMatch = path.match(/^api\/shares\/([^/]+)\/users$/);
			const shareId = shareUsersMatch?.[1];
			if (shareId) {
				if (method === 'GET' && apiCallHandler.getShareUsers) {
					return apiCallHandler.getShareUsers(shareId);
				}
				if (method === 'POST' && apiCallHandler.postShareUsers) {
					return apiCallHandler.postShareUsers(shareId, body);
				}
			}

			if (apiCallHandler.onUnhandled) {
				return apiCallHandler.onUnhandled(method, path, query, body, headers, options);
			}
			return null;
		},
		personalizedUserContentBaseUrl(_userId) {
			return null;
		},
	};
	store ??= createStore(testReducer);
	service.initialize(store, encryptionService(), api as JoplinServerApi);
	return service;
};
export default mockShareService;
