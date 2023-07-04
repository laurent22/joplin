import { FolderEntity } from '@joplin/lib/services/database/types';
import { linkedResourceIds } from '../joplinUtils';
import { Item, Share, ShareType, ShareUser, ShareUserStatus, User, Uuid } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { AppContext } from '../types';
import { patchApi, postApi } from './apiUtils';
import { checkContextError, createFolder, createItem, koaAppContext, models, makeFolderSerializedBody, makeNoteSerializedBody, updateFolder, createResource } from './testUtils';

interface ShareResult {
	share: Share;
	item: Item;
	shareUser: ShareUser;
}

export async function createFolderShare(sessionId: string, folderId: string): Promise<Share> {
	// const item = await createFolder(sessionId, { id: '00000000 });

	return postApi<Share>(sessionId, 'shares', {
		type: ShareType.Folder,
		folder_id: folderId,
	});
}

// For backward compatibility with old tests that used a different tree format.
function convertTree(tree: any): any[] {
	const output: any[] = [];

	for (const jopId in tree) {
		const children: any = tree[jopId];
		const isFolder = children !== null;

		if (isFolder) {
			output.push({
				id: jopId,
				children: convertTree(children),
			});
		} else {
			output.push({
				id: jopId,
			});
		}
	}

	return output;
}

async function createItemTree3(sessionId: Uuid, userId: Uuid, parentFolderId: string, shareId: Uuid, tree: any[]): Promise<void> {
	const user = await models().user().load(userId);

	for (const jopItem of tree) {
		const isFolder = !!jopItem.children;
		const serializedBody = isFolder ?
			makeFolderSerializedBody({ ...jopItem, parent_id: parentFolderId, share_id: shareId }) :
			makeNoteSerializedBody({ ...jopItem, parent_id: parentFolderId, share_id: shareId });

		if (!isFolder) {
			const resourceIds = linkedResourceIds(jopItem.body || '');
			for (const resourceId of resourceIds) {
				await createResource(sessionId, { id: resourceId, share_id: shareId }, `testing-${resourceId}`);
			}
		}

		const result = await models().item().saveFromRawContent(user, [{ name: `${jopItem.id}.md`, body: Buffer.from(serializedBody) }]);
		const newItem = result[`${jopItem.id}.md`].item;
		if (isFolder && jopItem.children.length) await createItemTree3(sessionId, userId, newItem.jop_id, shareId, jopItem.children);
	}
}

export async function inviteUserToShare(share: Share, sharerSessionId: string, recipientEmail: string, acceptShare = true) {
	let shareUser = await postApi(sharerSessionId, `shares/${share.id}/users`, {
		email: recipientEmail,
	}) as ShareUser;

	shareUser = await models().shareUser().load(shareUser.id);

	if (acceptShare) {
		const session = await models().session().createUserSession(shareUser.user_id);
		await patchApi(session.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted });
	}

	return shareUser;
}

export async function shareFolderWithUser(sharerSessionId: string, shareeSessionId: string, sharedFolderId: string, itemTree: any, acceptShare = true): Promise<ShareResult> {
	itemTree = Array.isArray(itemTree) ? itemTree : convertTree(itemTree);

	const sharee = await models().session().sessionUser(shareeSessionId);
	const sharer = await models().session().sessionUser(sharerSessionId);

	const rootFolderItem = await createFolder(sharerSessionId, {
		id: sharedFolderId,
		title: 'folder 1',
	});

	const share: Share = await postApi<Share>(sharerSessionId, 'shares', {
		type: ShareType.Folder,
		folder_id: rootFolderItem.jop_id,
	});

	const rootFolder: FolderEntity = await models().item().loadAsJoplinItem(rootFolderItem.id);
	await updateFolder(sharerSessionId, { ...rootFolder, share_id: share.id });

	for (const jopItem of itemTree) {
		if (jopItem.id === sharedFolderId) {
			await createItemTree3(sharerSessionId, sharer.id, sharedFolderId, share.id, jopItem.children);
		} else {
			await createItemTree3(sharerSessionId, sharer.id, '', '', [jopItem]);
		}
	}

	const shareUser = await inviteUserToShare(share, sharerSessionId, sharee.email, acceptShare);

	await models().share().updateSharedItems3();

	return { share, item: rootFolderItem, shareUser };
}

// Handles the whole process of:
//
// - User 1 creates a file (optionally)
// - User 1 creates a file share for it
// - User 1 shares this with user 2
// - User 2 accepts the share
//
// The result is that user 2 will have a file linked to user 1's file.
export async function shareWithUserAndAccept(sharerSessionId: string, shareeSessionId: string, sharee: User, shareType: ShareType = ShareType.Folder, item: Item = null): Promise<ShareResult> {
	item = item || await createItem(sharerSessionId, 'root:/test.txt:', 'testing share');

	let share: Share = null;

	if ([ShareType.Folder, ShareType.Note].includes(shareType)) {
		share = await postApi<Share>(sharerSessionId, 'shares', {
			type: shareType,
			note_id: shareType === ShareType.Note ? item.jop_id : undefined,
			folder_id: shareType === ShareType.Folder ? item.jop_id : undefined,
		});
	} else {
		const sharer = await models().session().sessionUser(sharerSessionId);

		share = await models().share().save({
			owner_id: sharer.id,
			type: shareType,
			item_id: item.id,
		});
	}

	let shareUser = await postApi(sharerSessionId, `shares/${share.id}/users`, {
		email: sharee.email,
	}) as ShareUser;

	shareUser = await models().shareUser().load(shareUser.id);

	await respondInvitation(shareeSessionId, shareUser.id, ShareUserStatus.Accepted);

	await models().share().updateSharedItems3();

	return { share, item, shareUser };
}

export async function respondInvitation(recipientSessionId: Uuid, shareUserId: Uuid, status: ShareUserStatus) {
	await patchApi(recipientSessionId, `share_users/${shareUserId}`, { status });
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
