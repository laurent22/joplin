import { Share, ShareType, ShareUser, Uuid } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { AppContext } from '../types';
import { checkContextError, koaAppContext } from './testUtils';

export async function postShareContext(sessionId: string, shareType: ShareType, itemId: Uuid): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: '/api/shares',
			body: {
				file_id: itemId,
				type: shareType,
			},
		},
	});
	await routeHandler(context);
	return context;
}

export async function postShare(sessionId: string, shareType: ShareType, itemId: Uuid): Promise<Share> {
	const context = await postShareContext(sessionId, shareType, itemId);
	checkContextError(context);
	return context.response.body;
}

export async function postShareUserContext(sessionId: string, shareId: Uuid, userEmail: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: `/api/shares/${shareId}/users`,
			body: {
				email: userEmail,
			},
		},
	});
	await routeHandler(context);
	return context;
}

export async function patchShareUserContext(sessionId: string, shareUserId: Uuid, body: ShareUser): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'PATCH',
			url: `/api/share_users/${shareUserId}`,
			body: body,
		},
	});
	await routeHandler(context);
	return context;
}

export async function patchShareUser(sessionId: string, shareUserId: Uuid, body: ShareUser): Promise<void> {
	const context = await patchShareUserContext(sessionId, shareUserId, body);
	checkContextError(context);
}

export async function postShareUser(sessionId: string, shareId: Uuid, userEmail: string): Promise<ShareUser> {
	const context = await postShareUserContext(sessionId, shareId, userEmail);
	checkContextError(context);
	return context.response.body;
}

export async function getShareContext(shareId: Uuid): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'GET',
			url: `/api/shares/${shareId}`,
		},
	});
	await routeHandler(context);
	return context;
}

export async function getShare(shareId: Uuid): Promise<Share> {
	const context = await getShareContext(shareId);
	checkContextError(context);
	return context.response.body;
}
