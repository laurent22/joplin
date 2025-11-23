"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    return [
        'ALTER TABLE `notes` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
        'ALTER TABLE `tags` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
        'ALTER TABLE `folders` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
        'ALTER TABLE `resources` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
    ];
};
