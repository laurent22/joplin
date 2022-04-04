"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const versionInfo_1 = require("./versionInfo");
const Plugin_1 = require("@joplin/lib/services/plugins/Plugin");
const plugin1 = new Plugin_1.default('', {
    manifest_version: 1,
    id: 'abc',
    name: 'abc',
    version: '1.0',
    app_min_version: '1.0',
}, '', () => { }, '');
const plugin2 = new Plugin_1.default('', {
    manifest_version: 2,
    id: 'abc',
    name: 'abc',
    version: '1.2',
    app_min_version: '1.2',
}, '', () => { }, '');
const plugin3 = new Plugin_1.default('', {
    manifest_version: 2,
    id: 'abc',
    name: 'abc',
    version: '1.2',
    app_min_version: '1.2',
}, '', () => { }, '');
describe('getPluginList', () => {
    it('should return an empty array if no plugins are provided', () => {
        expect((0, versionInfo_1.getPluginList)({})).toEqual([]);
    });
    it('should return the desired output', () => {
        expect((0, versionInfo_1.getPluginList)({ plugin1, plugin2, plugin3 })).toEqual(['   abc:1.0', '   abc:1.2', '   abc:1.2']);
    });
});
//# sourceMappingURL=versionInfo.test.js.map