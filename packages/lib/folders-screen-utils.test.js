"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./testing/test-utils");
const Folder_1 = require("./models/Folder");
const Setting_1 = require("./models/Setting");
const folders_screen_utils_1 = require("./folders-screen-utils");
describe('folders-screen-utils', () => {
    beforeEach(async () => {
        await (0, test_utils_1.setupDatabaseAndSynchronizer)(1);
        await (0, test_utils_1.switchClient)(1);
    });
    it('should use manual folder order when configured', async () => {
        Setting_1.default.setValue('folders.sortOrder.field', 'order');
        Setting_1.default.setValue('folders.sortOrder.reverse', false);
        const folder1 = await Folder_1.default.save({ title: 'folder1' });
        const folder2 = await Folder_1.default.save({ title: 'folder2' });
        const folders = await (0, folders_screen_utils_1.allForDisplay)();
        expect(folders.map(folder => folder.id)).toEqual([folder2.id, folder1.id]);
        expect(folder2.order).toBeLessThan(folder1.order);
    });
});
//# sourceMappingURL=folders-screen-utils.test.js.map