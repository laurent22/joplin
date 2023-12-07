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
const test_1 = require("./util/test");
const MainScreen_1 = require("./models/MainScreen");
const SettingsScreen_1 = require("./models/SettingsScreen");
test_1.test.describe('simpleBackup', () => {
    (0, test_1.test)('should have a section in settings', ({ electronApp, mainWindow }) => __awaiter(void 0, void 0, void 0, function* () {
        const mainScreen = new MainScreen_1.default(mainWindow);
        yield mainScreen.waitFor();
        // Open settings (check both labels so that this works on MacOS)
        yield mainScreen.openSettings(electronApp);
        // Should be on the settings screen
        const settingsScreen = new SettingsScreen_1.default(mainWindow);
        yield settingsScreen.waitFor();
        const backupTab = settingsScreen.getTabLocator('Backup');
        yield backupTab.waitFor();
    }));
});
//# sourceMappingURL=simpleBackup.spec.js.map