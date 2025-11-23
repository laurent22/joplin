"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    return [
        'ALTER TABLE sync_items ADD COLUMN remote_item_updated_time INT NOT NULL DEFAULT 0',
    ];
};
