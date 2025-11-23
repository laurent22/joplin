"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTimers = exports.scheduleRefreshFolders = exports.refreshFolders = exports.allForDisplay = void 0;
const Folder_1 = require("./models/Folder");
const Setting_1 = require("./models/Setting");
const shim_1 = require("./shim");
const refreshCalls_ = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let scheduleRefreshFoldersIID_ = null;
const allForDisplay = async (options = {}) => {
    const orderDir = Setting_1.default.value('folders.sortOrder.reverse') ? 'DESC' : 'ASC';
    const folderOptions = Object.assign({ caseInsensitive: true, order: [
            {
                by: 'title',
                dir: orderDir,
            },
        ] }, options);
    let folders = await Folder_1.default.all(folderOptions);
    if (Setting_1.default.value('folders.sortOrder.field') === 'last_note_user_updated_time') {
        folders = await Folder_1.default.orderByLastModified(folders, orderDir);
    }
    if (Setting_1.default.value('showNoteCounts')) {
        await Folder_1.default.addNoteCounts(folders, Setting_1.default.value('showCompletedTodos'));
    }
    return folders;
};
exports.allForDisplay = allForDisplay;
// `selectedFolderId` should be the currently selected folder. Set it to an empty string if that
// information is not available in the current context.
const refreshFolders = async (dispatch, selectedFolderId) => {
    refreshCalls_.push(true);
    try {
        const folders = await (0, exports.allForDisplay)({
            includeConflictFolder: true,
            includeTrash: true,
        });
        dispatch({
            type: 'FOLDER_UPDATE_ALL',
            items: folders,
        });
        // If the currently selected folder no longer exist, select a default folder
        if (selectedFolderId && !folders.find(f => f.id === selectedFolderId)) {
            const defaultFolder = await Folder_1.default.defaultFolder();
            if (defaultFolder) {
                dispatch({
                    type: 'FOLDER_SELECT',
                    id: defaultFolder.id,
                });
            }
        }
    }
    finally {
        refreshCalls_.pop();
    }
};
exports.refreshFolders = refreshFolders;
const scheduleRefreshFolders = async (dispatch, selectedFolderId) => {
    if (scheduleRefreshFoldersIID_)
        shim_1.default.clearTimeout(scheduleRefreshFoldersIID_);
    scheduleRefreshFoldersIID_ = shim_1.default.setTimeout(() => {
        scheduleRefreshFoldersIID_ = null;
        void (0, exports.refreshFolders)(dispatch, selectedFolderId);
    }, 1000);
};
exports.scheduleRefreshFolders = scheduleRefreshFolders;
const cancelTimers = async () => {
    if (scheduleRefreshFoldersIID_) {
        shim_1.default.clearTimeout(scheduleRefreshFoldersIID_);
        scheduleRefreshFoldersIID_ = null;
    }
    return new Promise((resolve) => {
        const iid = shim_1.default.setInterval(() => {
            if (!refreshCalls_.length) {
                shim_1.default.clearInterval(iid);
                resolve(null);
            }
        }, 100);
    });
};
exports.cancelTimers = cancelTimers;
