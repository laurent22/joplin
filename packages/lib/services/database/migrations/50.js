"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    return [
        'ALTER TABLE `folders` ADD COLUMN `order` NUMERIC NOT NULL DEFAULT 0',
        'CREATE INDEX folders_order ON folders (`order`)',
        'UPDATE folders SET `order` = created_time WHERE `order` = 0',
    ];
};
//# sourceMappingURL=50.js.map