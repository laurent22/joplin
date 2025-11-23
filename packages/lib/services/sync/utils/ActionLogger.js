"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemActionType = void 0;
const Logger_1 = require("@joplin/utils/Logger");
var ItemActionType;
(function (ItemActionType) {
    ItemActionType["Delete"] = "DeleteAction";
})(ItemActionType || (exports.ItemActionType = ItemActionType = {}));
const actionTypeToLogger = {
    [ItemActionType.Delete]: Logger_1.default.create(ItemActionType.Delete),
};
class ActionLogger {
    constructor(source) {
        this.source = source;
        this.descriptions_ = [];
    }
    clone() {
        const clone = new ActionLogger(this.source);
        clone.descriptions_ = [...this.descriptions_];
        return clone;
    }
    // addDescription is used to add labels with information that may not be available
    // when .log is called. For example, to include the title of a deleted note.
    addDescription(description) {
        this.descriptions_.push(description);
    }
    log(action, itemIds) {
        if (!ActionLogger.enabled_) {
            return;
        }
        const logger = actionTypeToLogger[action];
        logger.info(`${this.source}: ${this.descriptions_.join(',')}; Item IDs: ${JSON.stringify(itemIds)}`);
    }
    static from(source) {
        if (!source) {
            source = 'Unknown source';
        }
        if (typeof source === 'string') {
            return new ActionLogger(source);
        }
        return source;
    }
    static set enabled(v) {
        this.enabled_ = v;
    }
    static get enabled() {
        return this.enabled_;
    }
}
// Disabling the action logger globally can be useful on Joplin Server/Cloud
// when many deletions are expected (e.g. for email-to-note).
ActionLogger.enabled_ = true;
exports.default = ActionLogger;
