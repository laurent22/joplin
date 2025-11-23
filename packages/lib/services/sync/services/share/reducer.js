"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseShareCache = exports.defaultState = exports.stateRootKey = exports.ShareUserStatus = void 0;
exports.isSharedFolderOwner = isSharedFolderOwner;
exports.isRootSharedFolder = isRootSharedFolder;
const Logger_1 = require("@joplin/utils/Logger");
const logger = Logger_1.default.create('share/reducer');
var ShareUserStatus;
(function (ShareUserStatus) {
    ShareUserStatus[ShareUserStatus["Waiting"] = 0] = "Waiting";
    ShareUserStatus[ShareUserStatus["Accepted"] = 1] = "Accepted";
    ShareUserStatus[ShareUserStatus["Rejected"] = 2] = "Rejected";
})(ShareUserStatus || (exports.ShareUserStatus = ShareUserStatus = {}));
exports.stateRootKey = 'shareService';
exports.defaultState = {
    shares: [],
    shareUsers: {},
    shareInvitations: [],
    processingShareInvitationResponse: false,
};
const parseShareCache = (serialized) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    let raw = {};
    try {
        raw = JSON.parse(serialized);
        if (!raw)
            raw = {};
    }
    catch (error) {
        logger.info('Could not load share cache from settings - will return a default value. Error was:', error);
    }
    return {
        shares: raw.shares || [],
        shareUsers: raw.shareUsers || {},
        shareInvitations: raw.shareInvitations || [],
        processingShareInvitationResponse: false,
    };
};
exports.parseShareCache = parseShareCache;
function isSharedFolderOwner(state, folderId) {
    const userId = state.settings['sync.userId'];
    const share = state[exports.stateRootKey].shares.find(s => s.folder_id === folderId);
    if (!share)
        return false;
    return share.user.id === userId;
}
function isRootSharedFolder(folder) {
    if (!('share_id' in folder) || !('parent_id' in folder)) {
        logger.warn('Calling isRootSharedFolder without specifying share_id and parent_id:', folder);
        return false;
    }
    return !!folder.share_id && !folder.parent_id;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const reducer = (draftRoot, action) => {
    if (action.type.indexOf('SHARE_') !== 0)
        return;
    const draft = draftRoot.shareService;
    try {
        switch (action.type) {
            case 'SHARE_SET':
                draft.shares = action.shares;
                break;
            case 'SHARE_USER_SET':
                draft.shareUsers[action.shareId] = action.shareUsers;
                break;
            case 'SHARE_USER_UPDATE_ONE':
                {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                    const shareUser = draft.shareUsers[action.shareId].find((su) => su.id === action.shareUser.id);
                    if (!shareUser)
                        throw new Error(`No such user: ${JSON.stringify(action)}`);
                    for (const [name, value] of Object.entries(action.shareUser)) {
                        shareUser[name] = value;
                    }
                }
                break;
            case 'SHARE_INVITATION_SET':
                draft.shareInvitations = action.shareInvitations;
                break;
            case 'SHARE_INVITATION_RESPONSE_PROCESSING':
                draft.processingShareInvitationResponse = action.value;
                break;
        }
    }
    catch (error) {
        error.message = `In share reducer: ${error.message} Action: ${JSON.stringify(action)}`;
        throw error;
    }
};
exports.default = reducer;
