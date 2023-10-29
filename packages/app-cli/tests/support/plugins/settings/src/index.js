"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("api");
const types_1 = require("api/types");
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield api_1.default.settings.registerSection('myCustomSection', {
                label: 'My Custom Section',
                iconName: 'fas fa-music',
            });
            yield api_1.default.settings.registerSettings({
                'myCustomSetting': {
                    value: 123,
                    type: types_1.SettingItemType.Int,
                    section: 'myCustomSection',
                    public: true,
                    label: 'My Custom Setting',
                },
                'multiOptionTest': {
                    value: 'en',
                    type: types_1.SettingItemType.String,
                    section: 'myCustomSection',
                    isEnum: true,
                    public: true,
                    label: 'Multi-options test',
                    options: {
                        'en': 'English',
                        'fr': 'French',
                        'es': 'Spanish',
                    },
                },
                'mySecureSetting': {
                    value: 'hunter2',
                    type: types_1.SettingItemType.String,
                    section: 'myCustomSection',
                    public: true,
                    secure: true,
                    label: 'My Secure Setting',
                },
                'myFileSetting': {
                    value: 'abcd',
                    type: types_1.SettingItemType.String,
                    section: 'myCustomSection',
                    public: true,
                    label: 'My file setting',
                    description: 'This setting will be saved to settings.json',
                    ['storage']: 2, // Should be `storage: SettingStorage.File`
                },
                'myFilePathAndArgs': {
                    value: '',
                    type: types_1.SettingItemType.String,
                    subType: types_1.SettingItemSubType.FilePathAndArgs,
                    section: 'myCustomSection',
                    public: true,
                    label: 'File path and args',
                },
                'myFilePathOnly': {
                    value: '',
                    type: types_1.SettingItemType.String,
                    subType: types_1.SettingItemSubType.FilePath,
                    section: 'myCustomSection',
                    public: true,
                    label: 'File path',
                },
                'myDirectory': {
                    value: '',
                    type: types_1.SettingItemType.String,
                    subType: types_1.SettingItemSubType.DirectoryPath,
                    section: 'myCustomSection',
                    public: true,
                    label: 'Directory path',
                },
            });
            yield api_1.default.commands.register({
                name: 'incValue',
                label: 'Increment custom setting value',
                iconName: 'fas fa-music',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    const value = yield api_1.default.settings.value('myCustomSetting');
                    console.info('Got value', value);
                    yield api_1.default.settings.setValue('myCustomSetting', value + 1);
                }),
            });
            yield api_1.default.commands.register({
                name: 'checkValue',
                label: 'Check custom setting value',
                iconName: 'fas fa-drum',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    const value = yield api_1.default.settings.value('myCustomSetting');
                    console.info('Current value is: ' + value);
                    const secureValue = yield api_1.default.settings.value('mySecureSetting');
                    console.info('Secure value is: ' + secureValue);
                    const fileValue = yield api_1.default.settings.value('myFileSetting');
                    console.info('Setting in file is: ' + fileValue);
                }),
            });
            yield api_1.default.views.toolbarButtons.create('incValueButton', 'incValue', types_1.ToolbarButtonLocation.NoteToolbar);
            yield api_1.default.views.toolbarButtons.create('checkValueButton', 'checkValue', types_1.ToolbarButtonLocation.NoteToolbar);
        });
    },
});
//# sourceMappingURL=index.js.map