"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Resource_1 = require("../../../models/Resource");
const BaseItem_1 = require("../../../models/BaseItem");
const Setting_1 = require("../../../models/Setting");
const Logger_1 = require("@joplin/utils/Logger");
const logger = Logger_1.default.create('checkDisabledSyncItemsNotification');
exports.default = async (dispatch) => {
    const errorCount = await Resource_1.default.downloadStatusCounts(Resource_1.default.FETCH_STATUS_ERROR);
    if (errorCount) {
        logger.info(`${errorCount} resource download errors: Triggering notification`);
        dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
        return;
    }
    const disabledCount = await BaseItem_1.default.syncDisabledItemsCount(Setting_1.default.value('sync.target'));
    if (disabledCount) {
        logger.info(`${disabledCount} disabled sync items: Triggering notification`);
        dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
        return;
    }
    logger.info('No errors: Hiding notification');
    dispatch({
        type: 'SYNC_HAS_DISABLED_SYNC_ITEMS',
        value: false,
    });
};
