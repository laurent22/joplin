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
const fs_1 = require("fs");
const path_1 = require("path");
const notarize_1 = require("@electron/notarize");
const execCommand = require('./execCommand');
function isDesktopAppTag(tagName) {
    if (!tagName)
        return false;
    return tagName[0] === 'v';
}
exports.default = (params) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.platform !== 'darwin')
        return;
    console.info('Checking if notarization should be done...');
    if (!process.env.IS_CONTINUOUS_INTEGRATION || !isDesktopAppTag(process.env.GIT_TAG_NAME)) {
        console.info(`Either not running in CI or not processing a desktop app tag - skipping notarization. process.env.IS_CONTINUOUS_INTEGRATION = ${process.env.IS_CONTINUOUS_INTEGRATION}; process.env.GIT_TAG_NAME = ${process.env.GIT_TAG_NAME}`);
        return;
    }
    if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
        console.warn('Environment variables APPLE_ID and APPLE_ID_PASSWORD not found - notarization will NOT be done.');
        return;
    }
    // Same appId in electron-builder.
    const appId = 'net.cozic.joplin-desktop';
    const appPath = (0, path_1.join)(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    if (!(0, fs_1.existsSync)(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }
    console.log(`Notarizing ${appId} found at ${appPath}`);
    // Every x seconds we print something to stdout, otherwise CI may timeout
    // the task after 10 minutes, and Apple notarization can take more time.
    const waitingIntervalId = setInterval(() => {
        console.log('.');
    }, 60000);
    try {
        yield (0, notarize_1.notarize)({
            appBundleId: appId,
            appPath: appPath,
            // Apple Developer email address
            appleId: process.env.APPLE_ID,
            // App-specific password: https://support.apple.com/en-us/HT204397
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            // When Apple ID is attached to multiple providers (eg if the
            // account has been used to build multiple apps for different
            // companies), in that case the provider "Team Short Name" (also
            // known as "ProviderShortname") must be provided.
            //
            // Use this to get it:
            //
            // xcrun altool --list-providers -u APPLE_ID -p APPLE_ID_PASSWORD
            ascProvider: process.env.APPLE_ASC_PROVIDER,
        });
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
    clearInterval(waitingIntervalId);
    // It appears that electron-notarize doesn't staple the app, but without
    // this we were still getting the malware warning when launching the app.
    // Stapling the app means attaching the notarization ticket to it, so that
    // if the user is offline, macOS can still check if the app was notarized.
    // So it seems to be more or less optional, but at least in our case it
    // wasn't.
    console.log('Staple notarization ticket to the app...');
    const staplerCmd = `xcrun stapler staple "${appPath}"`;
    console.log(`> ${staplerCmd}`);
    console.log(yield execCommand(staplerCmd));
    console.log(`Done notarizing ${appId}`);
});
//# sourceMappingURL=notarizeMacApp.js.map