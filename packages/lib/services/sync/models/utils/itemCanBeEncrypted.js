"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1(item, share) {
    // Note has been published - currently we don't encrypt
    if (item.is_shared)
        return false;
    // Item has been shared with user, but sharee is not encrypting his notes,
    // so we shouldn't encrypt it either. Otherwise sharee will not be able to
    // view the note anymore. https://github.com/laurent22/joplin/issues/6645
    if (item.share_id && (!share || !share.master_key_id))
        return false;
    return true;
}
