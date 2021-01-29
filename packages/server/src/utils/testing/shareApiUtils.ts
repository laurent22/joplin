import { Share, ShareType, Uuid } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { AppContext } from '../types';
import { checkContextError, koaAppContext } from './testUtils';

export async function postShareContext(sessionId: string, itemId: Uuid): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: '/api/shares',
			body: {
				file_id: itemId,
				type: ShareType.Link,
			},
		},
	});
	await routeHandler(context);
	return context;
}

export async function postShare(sessionId: string, itemId: Uuid): Promise<Share> {
	const context = await postShareContext(sessionId, itemId);
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
