"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShare = exports.getShareContext = exports.postShareUser = exports.patchShareUser = exports.patchShareUserContext = exports.postShareUserContext = exports.postShare = exports.postShareContext = exports.respondInvitation = exports.shareWithUserAndAccept = exports.shareFolderWithUser = exports.inviteUserToShare = exports.createFolderShare = void 0;
const joplinUtils_1 = require("../joplinUtils");
const types_1 = require("../../services/database/types");
const routeHandler_1 = require("../../middleware/routeHandler");
const apiUtils_1 = require("./apiUtils");
const testUtils_1 = require("./testUtils");
function createFolderShare(sessionId, folderId) {
    return __awaiter(this, void 0, void 0, function* () {
        // const item = await createFolder(sessionId, { id: '00000000 });
        return (0, apiUtils_1.postApi)(sessionId, 'shares', {
            type: types_1.ShareType.Folder,
            folder_id: folderId,
        });
    });
}
exports.createFolderShare = createFolderShare;
// For backward compatibility with old tests that used a different tree format.
function convertTree(tree) {
    const output = [];
    for (const jopId in tree) {
        const children = tree[jopId];
        const isFolder = children !== null;
        if (isFolder) {
            output.push({
                id: jopId,
                children: convertTree(children),
            });
        }
        else {
            output.push({
                id: jopId,
            });
        }
    }
    return output;
}
function createItemTree3(sessionId, userId, parentFolderId, shareId, tree) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield (0, testUtils_1.models)().user().load(userId);
        for (const jopItem of tree) {
            const isFolder = !!jopItem.children;
            const serializedBody = isFolder ?
                (0, testUtils_1.makeFolderSerializedBody)(Object.assign(Object.assign({}, jopItem), { parent_id: parentFolderId, share_id: shareId })) :
                (0, testUtils_1.makeNoteSerializedBody)(Object.assign(Object.assign({}, jopItem), { parent_id: parentFolderId, share_id: shareId }));
            if (!isFolder) {
                const resourceIds = (0, joplinUtils_1.linkedResourceIds)(jopItem.body || '');
                for (const resourceId of resourceIds) {
                    yield (0, testUtils_1.createResource)(sessionId, { id: resourceId, share_id: shareId }, `testing-${resourceId}`);
                }
            }
            const result = yield (0, testUtils_1.models)().item().saveFromRawContent(user, [{ name: `${jopItem.id}.md`, body: Buffer.from(serializedBody) }]);
            const newItem = result[`${jopItem.id}.md`].item;
            if (isFolder && jopItem.children.length)
                yield createItemTree3(sessionId, userId, newItem.jop_id, shareId, jopItem.children);
        }
    });
}
function inviteUserToShare(share, sharerSessionId, recipientEmail, acceptShare = true) {
    return __awaiter(this, void 0, void 0, function* () {
        let shareUser = yield (0, apiUtils_1.postApi)(sharerSessionId, `shares/${share.id}/users`, {
            email: recipientEmail,
        });
        shareUser = yield (0, testUtils_1.models)().shareUser().load(shareUser.id);
        if (acceptShare) {
            const session = yield (0, testUtils_1.models)().session().createUserSession(shareUser.user_id);
            yield (0, apiUtils_1.patchApi)(session.id, `share_users/${shareUser.id}`, { status: types_1.ShareUserStatus.Accepted });
        }
        return shareUser;
    });
}
exports.inviteUserToShare = inviteUserToShare;
function shareFolderWithUser(sharerSessionId, shareeSessionId, sharedFolderId, itemTree, acceptShare = true) {
    return __awaiter(this, void 0, void 0, function* () {
        itemTree = Array.isArray(itemTree) ? itemTree : convertTree(itemTree);
        const sharee = yield (0, testUtils_1.models)().session().sessionUser(shareeSessionId);
        const sharer = yield (0, testUtils_1.models)().session().sessionUser(sharerSessionId);
        const rootFolderItem = yield (0, testUtils_1.createFolder)(sharerSessionId, {
            id: sharedFolderId,
            title: 'folder 1',
        });
        const share = yield (0, apiUtils_1.postApi)(sharerSessionId, 'shares', {
            type: types_1.ShareType.Folder,
            folder_id: rootFolderItem.jop_id,
        });
        const rootFolder = yield (0, testUtils_1.models)().item().loadAsJoplinItem(rootFolderItem.id);
        yield (0, testUtils_1.updateFolder)(sharerSessionId, Object.assign(Object.assign({}, rootFolder), { share_id: share.id }));
        for (const jopItem of itemTree) {
            if (jopItem.id === sharedFolderId) {
                yield createItemTree3(sharerSessionId, sharer.id, sharedFolderId, share.id, jopItem.children);
            }
            else {
                yield createItemTree3(sharerSessionId, sharer.id, '', '', [jopItem]);
            }
        }
        const shareUser = yield inviteUserToShare(share, sharerSessionId, sharee.email, acceptShare);
        yield (0, testUtils_1.models)().share().updateSharedItems3();
        return { share, item: rootFolderItem, shareUser };
    });
}
exports.shareFolderWithUser = shareFolderWithUser;
// Handles the whole process of:
//
// - User 1 creates a file (optionally)
// - User 1 creates a file share for it
// - User 1 shares this with user 2
// - User 2 accepts the share
//
// The result is that user 2 will have a file linked to user 1's file.
function shareWithUserAndAccept(sharerSessionId, shareeSessionId, sharee, shareType = types_1.ShareType.Folder, item = null) {
    return __awaiter(this, void 0, void 0, function* () {
        item = item || (yield (0, testUtils_1.createItem)(sharerSessionId, 'root:/test.txt:', 'testing share'));
        let share = null;
        if ([types_1.ShareType.Folder, types_1.ShareType.Note].includes(shareType)) {
            share = yield (0, apiUtils_1.postApi)(sharerSessionId, 'shares', {
                type: shareType,
                note_id: shareType === types_1.ShareType.Note ? item.jop_id : undefined,
                folder_id: shareType === types_1.ShareType.Folder ? item.jop_id : undefined,
            });
        }
        else {
            const sharer = yield (0, testUtils_1.models)().session().sessionUser(sharerSessionId);
            share = yield (0, testUtils_1.models)().share().save({
                owner_id: sharer.id,
                type: shareType,
                item_id: item.id,
            });
        }
        let shareUser = yield (0, apiUtils_1.postApi)(sharerSessionId, `shares/${share.id}/users`, {
            email: sharee.email,
        });
        shareUser = yield (0, testUtils_1.models)().shareUser().load(shareUser.id);
        yield respondInvitation(shareeSessionId, shareUser.id, types_1.ShareUserStatus.Accepted);
        yield (0, testUtils_1.models)().share().updateSharedItems3();
        return { share, item, shareUser };
    });
}
exports.shareWithUserAndAccept = shareWithUserAndAccept;
function respondInvitation(recipientSessionId, shareUserId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, apiUtils_1.patchApi)(recipientSessionId, `share_users/${shareUserId}`, { status });
    });
}
exports.respondInvitation = respondInvitation;
function postShareContext(sessionId, shareType, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
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
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.postShareContext = postShareContext;
function postShare(sessionId, shareType, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield postShareContext(sessionId, shareType, itemId);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.postShare = postShare;
function postShareUserContext(sessionId, shareId, userEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'POST',
                url: `/api/shares/${shareId}/users`,
                body: {
                    email: userEmail,
                },
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.postShareUserContext = postShareUserContext;
function patchShareUserContext(sessionId, shareUserId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'PATCH',
                url: `/api/share_users/${shareUserId}`,
                body: body,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.patchShareUserContext = patchShareUserContext;
function patchShareUser(sessionId, shareUserId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield patchShareUserContext(sessionId, shareUserId, body);
        (0, testUtils_1.checkContextError)(context);
    });
}
exports.patchShareUser = patchShareUser;
function postShareUser(sessionId, shareId, userEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield postShareUserContext(sessionId, shareId, userEmail);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.postShareUser = postShareUser;
function getShareContext(shareId) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            request: {
                method: 'GET',
                url: `/api/shares/${shareId}`,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.getShareContext = getShareContext;
function getShare(shareId) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield getShareContext(shareId);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.getShare = getShare;
//# sourceMappingURL=shareApiUtils.js.map