"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    return [
        'ALTER TABLE `resources` ADD COLUMN blob_updated_time INT NOT NULL DEFAULT 0',
        'UPDATE `resources` SET blob_updated_time = updated_time',
    ];
};
