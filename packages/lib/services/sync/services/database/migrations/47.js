"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    return [
        'ALTER TABLE sync_items ADD COLUMN sync_warning_ignored INT NOT NULL DEFAULT "0"',
    ];
};
