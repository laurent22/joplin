"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const JoplinServerApi_1 = require("../../../JoplinServerApi");
const registry_1 = require("../../../registry");
const ShareService_1 = require("../../../services/share/ShareService");
const shim_1 = require("../../../shim");
const types_1 = require("../ShareNoteDialog/types");
const { useCallback } = shim_1.default.react();
const logger = Logger_1.default.create('PublishFolderDialog/useOnPublishFolderLinkClick');
const useOnPublishFolderLinkClick = ({ folderId, publishedShare, setPublishFolderStatus, onShareUrlReady, }) => {
    return useCallback(async () => {
        const service = ShareService_1.default.instance();
        let hasSynced = false;
        let tryToSync = false;
        while (true) {
            try {
                if (tryToSync) {
                    setPublishFolderStatus(types_1.SharingStatus.Synchronizing);
                    await registry_1.reg.waitForSyncFinishedThenSync();
                    tryToSync = false;
                    hasSynced = true;
                }
                setPublishFolderStatus(types_1.SharingStatus.Creating);
                const share = publishedShare || await service.publishFolder(folderId);
                if (!publishedShare) {
                    setPublishFolderStatus(types_1.SharingStatus.Synchronizing);
                    await registry_1.reg.waitForSyncFinishedThenSync();
                    setPublishFolderStatus(types_1.SharingStatus.Creating);
                }
                onShareUrlReady(service.shareUrl(service.userId, share));
                setPublishFolderStatus(types_1.SharingStatus.Created);
                await ShareService_1.default.instance().refreshShares();
            }
            catch (error) {
                if (error.code === 404 && !hasSynced) {
                    logger.info('PublishFolderDialog: Notebook does not exist on server - trying to sync it.', error);
                    tryToSync = true;
                    continue;
                }
                console.error(error);
                logger.error('PublishFolderDialog: Cannot publish notebook:', error);
                setPublishFolderStatus(types_1.SharingStatus.Idle);
                void shim_1.default.showErrorDialog(JoplinServerApi_1.default.connectionErrorMessage(error));
            }
            break;
        }
    }, [folderId, onShareUrlReady, publishedShare, setPublishFolderStatus]);
};
exports.default = useOnPublishFolderLinkClick;
//# sourceMappingURL=useOnPublishFolderLinkClick.js.map