import { Item, Share, ShareType, ShareUser, User, Uuid } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { AppContext } from '../types';
import { patchApi, postApi } from './apiUtils';
import { checkContextError, createFile, createItem, koaAppContext, models } from './testUtils';

// Handles the whole process of:
//
// - User 1 creates a file (optionally)
// - User 1 creates a file share for it
// - User 1 shares this with user 2
// - User 2 accepts the share
//
// The result is that user 2 will have a file linked to user 1's file.
export async function shareWithUserAndAccept(sharerSessionId:string, shareeSessionId:string, sharee:User, item:Item = null):Promise<Item> {
	item = item || await createItem(sharerSessionId, 'root:/test.txt:', 'testing share');

	const share = await postApi<Share>(sharerSessionId, 'shares', {
		type: ShareType.App,
		item_id: item.id,
	});

	let shareUser = await postApi(sharerSessionId, `shares/${share.id}/users`, {
		email: sharee.email,
	}) as ShareUser;

	shareUser = await models().shareUser().load(shareUser.id);

	await patchApi(shareeSessionId, `share_users/${shareUser.id}`, { is_accepted: 1 });

	return item;
}

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
