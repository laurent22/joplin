"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyProgress = exports.ScrollbarSize = exports.CameraDirection = void 0;
const path_1 = require("@joplin/utils/path");
const SyncTargetRegistry_1 = require("../../SyncTargetRegistry");
const locale_1 = require("../../locale");
const shim_1 = require("../../shim");
const time_1 = require("../../time");
const types_1 = require("./types");
const noteListType_1 = require("../../services/plugins/api/noteListType");
const ObjectUtils = require("../../ObjectUtils");
const { toTitleCase } = require("../../string-utils.js");
const customCssFilePath = (Setting, filename) => {
    return `${Setting.value("rootProfileDir")}/${filename}`;
};
const showVoiceTypingSettings = () => 
// For now, iOS and web don't support voice typing.
shim_1.default.mobilePlatform() === "android";
var CameraDirection;
(function (CameraDirection) {
    CameraDirection[CameraDirection["Back"] = 0] = "Back";
    CameraDirection[CameraDirection["Front"] = 1] = "Front";
})(CameraDirection || (exports.CameraDirection = CameraDirection = {}));
var ScrollbarSize;
(function (ScrollbarSize) {
    ScrollbarSize[ScrollbarSize["Small"] = 7] = "Small";
    ScrollbarSize[ScrollbarSize["Medium"] = 12] = "Medium";
    ScrollbarSize[ScrollbarSize["Large"] = 24] = "Large";
})(ScrollbarSize || (exports.ScrollbarSize = ScrollbarSize = {}));
var SurveyProgress;
(function (SurveyProgress) {
    SurveyProgress[SurveyProgress["NotStarted"] = 0] = "NotStarted";
    SurveyProgress[SurveyProgress["Started"] = 1] = "Started";
    SurveyProgress[SurveyProgress["Dismissed"] = 2] = "Dismissed";
})(SurveyProgress || (exports.SurveyProgress = SurveyProgress = {}));
const builtInMetadata = (Setting) => {
    const platform = shim_1.default.platformName();
    const mobilePlatform = shim_1.default.mobilePlatform();
    let wysiwygYes = "";
    let wysiwygNo = "";
    if (shim_1.default.isElectron()) {
        wysiwygYes = ` ${(0, locale_1._)("(wysiwyg: %s)", (0, locale_1._)("yes"))}`;
        wysiwygNo = ` ${(0, locale_1._)("(wysiwyg: %s)", (0, locale_1._)("no"))}`;
    }
    const emptyDirWarning = (0, locale_1._)("Attention: If you change this location, make sure you copy all your content to it before syncing, otherwise all files will be removed! See the FAQ for more details: %s", "https://joplinapp.org/help/faq");
    // A "public" setting means that it will show up in the various config screens (or config command for the CLI tool), however
    // if if private a setting might still be handled and modified by the app. For instance, the settings related to sorting notes are not
    // public for the mobile and desktop apps because they are handled separately in menus.
    const themeOptions = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        output[Setting.THEME_LIGHT] = (0, locale_1._)("Light");
        output[Setting.THEME_DARK] = (0, locale_1._)("Dark");
        output[Setting.THEME_DRACULA] = (0, locale_1._)("Dracula");
        output[Setting.THEME_SOLARIZED_LIGHT] = (0, locale_1._)("Solarised Light");
        output[Setting.THEME_SOLARIZED_DARK] = (0, locale_1._)("Solarised Dark");
        output[Setting.THEME_NORD] = (0, locale_1._)("Nord");
        output[Setting.THEME_ARITIM_DARK] = (0, locale_1._)("Aritim Dark");
        output[Setting.THEME_OLED_DARK] = (0, locale_1._)("OLED Dark");
        return output;
    };
    const output = {
        clientId: {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        altInstanceId: {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.codeView": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "sync.openSyncWizard": {
            value: null,
            type: types_1.SettingItemType.Button,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Open Sync Wizard..."),
            hideLabel: true,
            section: "sync",
        },
        "sync.wizard.autoShowOnStartup": {
            value: mobilePlatform === "web",
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Mobile],
            label: () => "Show the sync wizard on startup if no sync target is selected",
            section: "sync",
        },
        "sync.target": {
            value: 0,
            type: types_1.SettingItemType.Int,
            isEnum: true,
            public: true,
            section: "sync",
            label: () => (0, locale_1._)("Synchronisation target"),
            description: (appType) => {
                return appType !== "cli"
                    ? null
                    : (0, locale_1._)("The target to synchronise to. Each sync target may have additional parameters which are named as `sync.NUM.NAME` (all documented below).");
            },
            options: () => {
                return SyncTargetRegistry_1.default.idAndLabelPlainObject(platform);
            },
            optionsOrder: () => {
                return SyncTargetRegistry_1.default.optionsOrder();
            },
            storage: types_1.SettingStorage.File,
        },
        "sync.showPrompt": {
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "sync",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Show Joplin Cloud sync prompt"),
            description: () => (0, locale_1._)("Show prompt suggesting Joplin Cloud synchronisation"),
        },
        "sync.upgradeState": {
            value: Setting.SYNC_UPGRADE_STATE_IDLE,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "sync.startupOperation": {
            value: types_1.SyncStartupOperation.None,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "sync.2.path": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                try {
                    return (settings["sync.target"] ===
                        SyncTargetRegistry_1.default.nameToId("filesystem"));
                }
                catch (error) {
                    return false;
                }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            filter: (value) => {
                return value ? (0, path_1.rtrimSlashes)(value) : "";
            },
            public: true,
            label: () => (0, locale_1._)("Directory to synchronise with (absolute path)"),
            description: () => emptyDirWarning,
            storage: types_1.SettingStorage.File,
        },
        "sync.5.path": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("nextcloud"));
            },
            public: true,
            label: () => (0, locale_1._)("Nextcloud WebDAV URL"),
            description: () => emptyDirWarning,
            storage: types_1.SettingStorage.File,
        },
        "sync.5.username": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("nextcloud"));
            },
            public: true,
            label: () => (0, locale_1._)("Nextcloud username"),
            storage: types_1.SettingStorage.File,
        },
        "sync.5.password": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("nextcloud"));
            },
            public: true,
            label: () => (0, locale_1._)("Nextcloud password"),
            secure: true,
        },
        "sync.6.path": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("webdav"));
            },
            public: true,
            label: () => (0, locale_1._)("WebDAV URL"),
            description: () => emptyDirWarning,
            storage: types_1.SettingStorage.File,
        },
        "sync.6.username": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("webdav"));
            },
            public: true,
            label: () => (0, locale_1._)("WebDAV username"),
            storage: types_1.SettingStorage.File,
        },
        "sync.6.password": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("webdav"));
            },
            public: true,
            label: () => (0, locale_1._)("WebDAV password"),
            secure: true,
        },
        "sync.8.path": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                try {
                    return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("amazon_s3"));
                }
                catch (error) {
                    return false;
                }
            },
            filter: (value) => {
                return value ? (0, path_1.rtrimSlashes)(value) : "";
            },
            public: true,
            label: () => (0, locale_1._)("S3 bucket"),
            description: () => emptyDirWarning,
            storage: types_1.SettingStorage.File,
        },
        "sync.8.url": {
            value: "https://s3.amazonaws.com/",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("amazon_s3"));
            },
            filter: (value) => {
                return value ? value.trim() : "";
            },
            public: true,
            label: () => (0, locale_1._)("S3 URL"),
            storage: types_1.SettingStorage.File,
        },
        "sync.8.region": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("amazon_s3"));
            },
            filter: (value) => {
                return value ? value.trim() : "";
            },
            public: true,
            label: () => (0, locale_1._)("S3 region"),
            storage: types_1.SettingStorage.File,
        },
        "sync.8.username": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("amazon_s3"));
            },
            public: true,
            label: () => (0, locale_1._)("S3 access key"),
            storage: types_1.SettingStorage.File,
        },
        "sync.8.password": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("amazon_s3"));
            },
            public: true,
            label: () => (0, locale_1._)("S3 secret key"),
            secure: true,
        },
        "sync.8.forcePathStyle": {
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] === SyncTargetRegistry_1.default.nameToId("amazon_s3"));
            },
            public: true,
            label: () => (0, locale_1._)("Force path style"),
            storage: types_1.SettingStorage.File,
        },
        "sync.9.path": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] ===
                    SyncTargetRegistry_1.default.nameToId("joplinServer"));
            },
            public: true,
            label: () => (0, locale_1._)("Joplin Server URL"),
            description: () => emptyDirWarning,
            storage: types_1.SettingStorage.File,
        },
        "sync.9.userContentPath": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        "sync.9.username": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] ===
                    SyncTargetRegistry_1.default.nameToId("joplinServer"));
            },
            public: true,
            label: () => (0, locale_1._)("Joplin Server email"),
            storage: types_1.SettingStorage.File,
        },
        "sync.9.password": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] ===
                    SyncTargetRegistry_1.default.nameToId("joplinServer"));
            },
            public: true,
            label: () => (0, locale_1._)("Joplin Server password"),
            secure: true,
        },
        "sync.11.path": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return (settings["sync.target"] ===
                    SyncTargetRegistry_1.default.nameToId("joplinServerSaml"));
            },
            public: true,
            label: () => (0, locale_1._)("Joplin Server URL"),
            description: () => emptyDirWarning,
            storage: types_1.SettingStorage.File,
        },
        "sync.11.userContentPath": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        "sync.11.id": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        "sync.11.userId": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        // Although sync.10.path is essentially a constant, we still define
        // it here so that both Joplin Server and Joplin Cloud can be
        // handled in the same consistent way. Also having it a setting
        // means it can be set to something else for development.
        "sync.10.path": {
            value: "https://api.joplincloud.com",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        "sync.10.userContentPath": {
            value: "https://joplinusercontent.com",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        "sync.10.website": {
            value: "https://joplincloud.com",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        "sync.10.username": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.File,
        },
        "sync.10.password": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            secure: true,
        },
        "sync.10.inboxEmail": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.10.inboxId": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.10.canUseSharePermissions": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
        },
        "sync.10.accountType": {
            value: 0,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "sync.10.userEmail": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.5.syncTargets": {
            value: {},
            type: types_1.SettingItemType.Object,
            public: false,
        },
        "sync.resourceDownloadMode": {
            value: "always",
            type: types_1.SettingItemType.String,
            section: "sync",
            public: true,
            advanced: true,
            isEnum: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Attachment download behaviour"),
            description: () => (0, locale_1._)('In "Manual" mode, attachments are downloaded only when you click on them. In "Auto", they are downloaded when you open the note. In "Always", all the attachments are downloaded whether you open the note or not.'),
            options: () => {
                return {
                    always: (0, locale_1._)("Always"),
                    manual: (0, locale_1._)("Manual"),
                    auto: (0, locale_1._)("Auto"),
                };
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "sync.3.auth": { value: "", type: types_1.SettingItemType.String, public: false },
        "sync.4.auth": { value: "", type: types_1.SettingItemType.String, public: false },
        "sync.7.auth": { value: "", type: types_1.SettingItemType.String, public: false },
        "sync.9.auth": { value: "", type: types_1.SettingItemType.String, public: false },
        "sync.10.auth": { value: "", type: types_1.SettingItemType.String, public: false },
        "sync.1.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.2.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.3.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.4.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.5.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.6.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.7.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.8.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.9.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.10.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.11.context": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "sync.maxConcurrentConnections": {
            value: 5,
            type: types_1.SettingItemType.Int,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: true,
            advanced: true,
            section: "sync",
            label: () => (0, locale_1._)("Max concurrent connections"),
            minimum: 1,
            maximum: 20,
            step: 1,
        },
        // The active folder ID is guaranteed to be valid as long as there's at least one
        // existing folder, so it is a good default in contexts where there's no currently
        // selected folder. It corresponds in general to the currently selected folder or
        // to the last folder that was selected.
        activeFolderId: { value: "", type: types_1.SettingItemType.String, public: false },
        notesParent: { value: "", type: types_1.SettingItemType.String, public: false },
        richTextBannerDismissed: {
            value: false,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: false,
        },
        "editor.pluginCompatibilityBannerDismissedFor": {
            value: [], // List of plugin IDs
            type: types_1.SettingItemType.Array,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: false,
        },
        firstStart: { value: true, type: types_1.SettingItemType.Bool, public: false },
        locale: {
            value: (0, locale_1.defaultLocale)(),
            type: types_1.SettingItemType.String,
            isEnum: true,
            public: true,
            label: () => (0, locale_1._)("Language"),
            options: () => {
                return ObjectUtils.sortByValue((0, locale_1.supportedLocalesToLanguages)({ includeStats: true }));
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        dateFormat: {
            value: Setting.DATE_FORMAT_1,
            type: types_1.SettingItemType.String,
            isEnum: true,
            public: true,
            label: () => (0, locale_1._)("Date format"),
            options: () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const options = {};
                const now = new Date("2017-01-30T12:00:00").getTime();
                options[Setting.DATE_FORMAT_1] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_1);
                options[Setting.DATE_FORMAT_2] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_2);
                options[Setting.DATE_FORMAT_3] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_3);
                options[Setting.DATE_FORMAT_4] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_4);
                options[Setting.DATE_FORMAT_5] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_5);
                options[Setting.DATE_FORMAT_6] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_6);
                options[Setting.DATE_FORMAT_7] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_7);
                options[Setting.DATE_FORMAT_8] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_8);
                options[Setting.DATE_FORMAT_9] = time_1.default.formatMsToLocal(now, Setting.DATE_FORMAT_9);
                return options;
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        timeFormat: {
            value: Setting.TIME_FORMAT_1,
            type: types_1.SettingItemType.String,
            isEnum: true,
            public: true,
            label: () => (0, locale_1._)("Time format"),
            options: () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const options = {};
                const now = new Date("2017-01-30T20:30:00").getTime();
                options[Setting.TIME_FORMAT_1] = time_1.default.formatMsToLocal(now, Setting.TIME_FORMAT_1);
                options[Setting.TIME_FORMAT_2] = time_1.default.formatMsToLocal(now, Setting.TIME_FORMAT_2);
                options[Setting.TIME_FORMAT_3] = time_1.default.formatMsToLocal(now, Setting.TIME_FORMAT_3);
                return options;
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "ocr.enabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Enable optical character recognition (OCR)"),
            description: () => (0, locale_1._)("When enabled, the application will scan your attachments and extract the text from it. This will allow you to search for text in these attachments."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "ocr.handwrittenTextDriverEnabled": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Enable handwritten transcription"),
            description: () => "Allows selecting specific attachments for higher-quality on-server OCR. When enabled, the right-click menu for an attachment includes an option to send an attachment to Joplin Cloud/Server for off-device processing.\n\nExperimental! It may not work at all. Requires Joplin Server or Cloud.",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            advanced: true,
        },
        "ocr.languageDataPath": {
            value: "",
            type: types_1.SettingItemType.String,
            advanced: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("OCR: Language data URL or path"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "ocr.clearLanguageDataCache": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            storage: types_1.SettingStorage.Database,
        },
        "ocr.clearLanguageDataCacheButton": {
            value: null,
            type: types_1.SettingItemType.Button,
            advanced: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("OCR: Clear cache and re-download language data files"),
        },
        "ocr.searchInExtractedContent": {
            value: true,
            type: types_1.SettingItemType.Bool,
            advanced: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            storage: types_1.SettingStorage.Database,
            label: () => (0, locale_1._)("OCR: Search in extracted content"),
        },
        theme: {
            value: Setting.THEME_LIGHT,
            type: types_1.SettingItemType.Int,
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            show: (settings) => {
                return !settings["themeAutoDetect"];
            },
            isEnum: true,
            label: () => (0, locale_1._)("Theme"),
            section: "appearance",
            options: () => themeOptions(),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        themeAutoDetect: {
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "appearance",
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            public: true,
            label: () => (0, locale_1._)("Automatically switch theme to match system theme"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        preferredLightTheme: {
            value: Setting.THEME_LIGHT,
            type: types_1.SettingItemType.Int,
            public: true,
            show: (settings) => {
                return settings["themeAutoDetect"];
            },
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            isEnum: true,
            label: () => (0, locale_1._)("Preferred light theme"),
            section: "appearance",
            options: () => themeOptions(),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        preferredDarkTheme: {
            value: Setting.THEME_DARK,
            type: types_1.SettingItemType.Int,
            public: true,
            show: (settings) => {
                return settings["themeAutoDetect"];
            },
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            isEnum: true,
            label: () => (0, locale_1._)("Preferred dark theme"),
            section: "appearance",
            options: () => themeOptions(),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        notificationPermission: {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        showNoteCounts: {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: false,
            advanced: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Cli],
            label: () => (0, locale_1._)("Show note counts"),
        },
        layoutButtonSequence: {
            value: Setting.LAYOUT_ALL,
            type: types_1.SettingItemType.Int,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            isEnum: true,
            options: () => ({
                [Setting.LAYOUT_ALL]: (0, locale_1._)("%s / %s / %s", (0, locale_1._)("Editor"), (0, locale_1._)("Viewer"), (0, locale_1._)("Split View")),
                [Setting.LAYOUT_EDITOR_VIEWER]: (0, locale_1._)("%s / %s", (0, locale_1._)("Editor"), (0, locale_1._)("Viewer")),
                [Setting.LAYOUT_EDITOR_SPLIT]: (0, locale_1._)("%s / %s", (0, locale_1._)("Editor"), (0, locale_1._)("Split View")),
                [Setting.LAYOUT_VIEWER_SPLIT]: (0, locale_1._)("%s / %s", (0, locale_1._)("Viewer"), (0, locale_1._)("Split View")),
            }),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        uncompletedTodosOnTop: {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            section: "note",
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Uncompleted to-dos on top"),
        },
        showCompletedTodos: {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            section: "note",
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Show completed to-dos"),
        },
        "notes.sortOrder.field": {
            value: "user_updated_time",
            type: types_1.SettingItemType.String,
            section: "note",
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Sort notes by"),
            options: () => {
                const Note = require("../Note").default;
                const noteSortFields = [
                    "user_updated_time",
                    "user_created_time",
                    "title",
                    "order",
                    "todo_due",
                    "todo_completed",
                ];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const options = {};
                for (let i = 0; i < noteSortFields.length; i++) {
                    options[noteSortFields[i]] = toTitleCase(Note.fieldToLabel(noteSortFields[i]));
                }
                return options;
            },
            storage: types_1.SettingStorage.File,
            isGlobal: false,
        },
        "editor.autoMatchingBraces": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            section: "note",
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Auto-pair braces, parentheses, quotations, etc."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.autocompleteMarkup": {
            value: true,
            advanced: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            section: "note",
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Autocomplete Markdown and HTML"),
            description: () => (0, locale_1._)("Enables Markdown list continuation, auto-closing HTML tags, and other markup autocompletions."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.enableHtmlToMarkdownBanner": {
            value: true,
            advanced: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            section: "note",
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Enable HTML-to-Markdown conversion banner"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.pastePreserveColors": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            section: "note",
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Preserve colours when pasting text in Rich Text Editor"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.enableTextPatterns": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            section: "note",
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Auto-format Markdown in the Rich Text Editor"),
            description: () => (0, locale_1._)("Enables Markdown pattern replacement in the Rich Text Editor. For example, when enabled, typing **bold** creates bold text."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.toolbarButtons": {
            value: [],
            public: false,
            type: types_1.SettingItemType.Array,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            appTypes: [types_1.AppType.Mobile],
            label: () => "buttons included in the editor toolbar",
        },
        "editor.tabMovesFocus": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            section: "note",
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Tab moves focus"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "notes.columns": {
            value: (0, noteListType_1.defaultListColumns)(),
            public: false,
            type: types_1.SettingItemType.Array,
            storage: types_1.SettingStorage.File,
            isGlobal: false,
        },
        "notes.sortOrder.reverse": {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: false,
            section: "note",
            public: true,
            label: () => (0, locale_1._)("Reverse sort order"),
            appTypes: [types_1.AppType.Cli],
        },
        // NOTE: A setting whose name starts with 'notes.sortOrder' is special,
        // which implies changing the setting automatically triggers the refresh of notes.
        // See lib/BaseApplication.ts/generalMiddleware() for details.
        "notes.sortOrder.buttonsVisible": {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            section: "appearance",
            public: true,
            label: () => (0, locale_1._)("Show sort order buttons"),
            // description: () => _('If true, sort order buttons (field + reverse) for notes are shown at the top of Note List.'),
            appTypes: [types_1.AppType.Desktop],
            isGlobal: true,
        },
        "notes.perFieldReversalEnabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            section: "note",
            public: false,
            appTypes: [types_1.AppType.Cli, types_1.AppType.Desktop],
        },
        "notes.perFieldReverse": {
            value: {
                user_updated_time: true,
                user_created_time: true,
                title: false,
                order: false,
            },
            type: types_1.SettingItemType.Object,
            storage: types_1.SettingStorage.File,
            section: "note",
            public: false,
            appTypes: [types_1.AppType.Cli, types_1.AppType.Desktop],
        },
        "notes.perFolderSortOrderEnabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            section: "folder",
            public: false,
            appTypes: [types_1.AppType.Cli, types_1.AppType.Desktop],
        },
        "notes.perFolderSortOrders": {
            value: {},
            type: types_1.SettingItemType.Object,
            storage: types_1.SettingStorage.File,
            section: "folder",
            public: false,
            appTypes: [types_1.AppType.Cli, types_1.AppType.Desktop],
        },
        "notes.sharedSortOrder": {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored old code from before rule was applied.
            value: {},
            type: types_1.SettingItemType.Object,
            section: "folder",
            public: false,
            appTypes: [types_1.AppType.Cli, types_1.AppType.Desktop],
        },
        "folders.sortOrder.field": {
            value: "title",
            type: types_1.SettingItemType.String,
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Sort notebooks by"),
            options: () => {
                const Folder = require("../Folder").default;
                const folderSortFields = ["title", "last_note_user_updated_time"];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const options = {};
                for (let i = 0; i < folderSortFields.length; i++) {
                    options[folderSortFields[i]] = toTitleCase(Folder.fieldToLabel(folderSortFields[i]));
                }
                return options;
            },
            storage: types_1.SettingStorage.File,
        },
        "folders.sortOrder.reverse": {
            value: false,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: true,
            label: () => (0, locale_1._)("Reverse sort order"),
            appTypes: [types_1.AppType.Cli],
        },
        trackLocation: {
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "note",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: true,
            label: () => (0, locale_1._)("Save geo-location with notes"),
        },
        "editor.usePlainText": {
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "note",
            public: true,
            appTypes: [types_1.AppType.Mobile],
            label: () => "Use the plain text editor",
            description: () => "The plain text editor has various issues and is no longer supported. If you are having issues with the new editor however you can revert to the old one using this setting.",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        // Enables/disables spellcheck in the mobile markdown beta editor.
        "editor.mobile.spellcheckEnabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "note",
            public: true,
            appTypes: [types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Enable spellcheck in the text editor"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.mobile.toolbarEnabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "note",
            public: true,
            appTypes: [types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Enable the Markdown toolbar"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        newTodoFocus: {
            value: "title",
            type: types_1.SettingItemType.String,
            section: "note",
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("When creating a new to-do:"),
            options: () => {
                return {
                    title: (0, locale_1._)("Focus title"),
                    body: (0, locale_1._)("Focus body"),
                };
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        newNoteFocus: {
            value: "body",
            type: types_1.SettingItemType.String,
            section: "note",
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("When creating a new note:"),
            options: () => {
                return {
                    title: (0, locale_1._)("Focus title"),
                    body: (0, locale_1._)("Focus body"),
                };
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        imageResizing: {
            value: "alwaysAsk",
            type: types_1.SettingItemType.String,
            section: "note",
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Resize large images:"),
            description: () => (0, locale_1._)("Shrink large images before adding them to notes."),
            options: () => {
                return {
                    alwaysAsk: (0, locale_1._)("Always ask"),
                    alwaysResize: (0, locale_1._)("Always resize"),
                    neverResize: (0, locale_1._)("Never resize"),
                };
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "notes.listRendererId": {
            value: "compact",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            storage: types_1.SettingStorage.File,
            isGlobal: false,
        },
        "plugins.states": {
            value: {},
            type: types_1.SettingItemType.Object,
            section: "plugins",
            public: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            needRestart: true,
            autoSave: true,
        },
        "plugins.enableWebviewDebugging": {
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "plugins",
            public: true,
            appTypes: [types_1.AppType.Mobile],
            show: (settings) => {
                // Hide on iOS due to App Store guidelines. See
                // https://github.com/laurent22/joplin/pull/10086 for details.
                // Hide on web -- debugging is enabled anyway, so this is not necessary.
                return (shim_1.default.mobilePlatform() === "android" &&
                    settings["plugins.pluginSupportEnabled"]);
            },
            needRestart: true,
            advanced: true,
            label: () => (0, locale_1._)("Plugin WebView debugging"),
            description: () => (0, locale_1._)("Allows debugging mobile plugins. See %s for details.", "https://joplinapp.org/help/api/references/mobile_plugin_debugging/"),
        },
        "plugins.pluginSupportEnabled": {
            value: false,
            public: true,
            autoSave: true,
            section: "plugins",
            advanced: true,
            type: types_1.SettingItemType.Bool,
            appTypes: [types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Enable plugin support"),
            // On mobile, we have a screen that manages this setting when it's disabled.
            show: (settings) => settings["plugins.pluginSupportEnabled"],
        },
        "plugins.devPluginPaths": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "plugins",
            public: true,
            advanced: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            // For now, development plugins are only enabled on desktop & web.
            show: (settings) => {
                if (shim_1.default.isElectron())
                    return true;
                if (shim_1.default.mobilePlatform() !== "web")
                    return false;
                const pluginSupportEnabled = settings["plugins.pluginSupportEnabled"];
                return !!pluginSupportEnabled;
            },
            label: () => "Development plugins",
            description: () => {
                if (shim_1.default.mobilePlatform()) {
                    return "The path to a plugin's development directory. When the plugin is rebuilt, Joplin reloads the plugin automatically.";
                }
                else {
                    return "You may add multiple plugin paths, each separated by a comma. You will need to restart the application for the changes to take effect.";
                }
            },
            storage: types_1.SettingStorage.File,
        },
        "plugins.shownEditorViewIds": {
            value: [],
            type: types_1.SettingItemType.Array,
            public: false,
        },
        // Deprecated - use markdown.plugin.*
        "markdown.softbreaks": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
        },
        "markdown.typographer": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
        },
        // Deprecated
        "markdown.plugin.softbreaks": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable soft breaks")}${wysiwygYes}`,
        },
        "markdown.plugin.typographer": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable typographer support")}${wysiwygYes}`,
        },
        "markdown.plugin.linkify": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable Linkify")}${wysiwygYes}`,
        },
        "markdown.plugin.katex": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable math expressions")}${wysiwygYes}`,
        },
        "markdown.plugin.fountain": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable Fountain syntax support")}${wysiwygYes}`,
        },
        "markdown.plugin.mermaid": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable Mermaid diagrams support")}${wysiwygYes}`,
        },
        "markdown.plugin.audioPlayer": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable audio player")}${wysiwygNo}`,
        },
        "markdown.plugin.videoPlayer": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable video player")}${wysiwygNo}`,
        },
        "markdown.plugin.pdfViewer": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: !mobilePlatform,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable PDF viewer")}${wysiwygNo}`,
        },
        "markdown.plugin.mark": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable ==mark== syntax")}${wysiwygYes}`,
        },
        "markdown.plugin.footnote": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable footnotes")}${wysiwygNo}`,
        },
        "markdown.plugin.toc": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: true,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable table of contents extension")}${wysiwygNo}`,
        },
        "markdown.plugin.sub": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable ~sub~ syntax")}${wysiwygYes}`,
        },
        "markdown.plugin.sup": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable ^sup^ syntax")}${wysiwygYes}`,
        },
        "markdown.plugin.deflist": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable deflist syntax")}${wysiwygNo}`,
        },
        "markdown.plugin.abbr": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable abbreviation syntax")}${wysiwygNo}`,
        },
        "markdown.plugin.emoji": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable markdown emoji")}${wysiwygNo}`,
        },
        "markdown.plugin.insert": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable ++insert++ syntax")}${wysiwygYes}`,
        },
        "markdown.plugin.multitable": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Mobile, types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable multimarkdown table extension")}${wysiwygNo}`,
        },
        // For now, applies only to the Markdown viewer
        "renderer.fileUrls": {
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "markdownPlugins",
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => `${(0, locale_1._)("Enable file:// URLs for images and videos")}${wysiwygYes}`,
        },
        // Tray icon (called AppIndicator) doesn't work in Ubuntu
        // http://www.webupd8.org/2017/04/fix-appindicator-not-working-for.html
        // Might be fixed in Electron 18.x but no non-beta release yet. So for now
        // by default we disable it on Linux.
        showTrayIcon: {
            value: platform !== "linux",
            type: types_1.SettingItemType.Bool,
            section: "application",
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Show tray icon"),
            description: () => {
                return platform === "linux"
                    ? (0, locale_1._)("Note: Does not work in all desktop environments.")
                    : (0, locale_1._)("This will allow Joplin to run in the background. It is recommended to enable this setting so that your notes are constantly being synchronised, thus reducing the number of conflicts.");
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        showMenuBar: {
            value: true, // Show the menu bar by default
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Desktop],
        },
        startMinimized: {
            value: false,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            section: "application",
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Start application minimised in the tray icon"),
            show: (settings) => !!settings["showTrayIcon"],
        },
        collapsedFolderIds: {
            value: [],
            type: types_1.SettingItemType.Array,
            public: false,
        },
        "keychain.supported": {
            value: -1,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "keychain.lastAvailableDrivers": {
            value: [],
            type: types_1.SettingItemType.Array,
            public: false,
        },
        "db.ftsEnabled": { value: -1, type: types_1.SettingItemType.Int, public: false },
        "db.fuzzySearchEnabled": {
            value: -1,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "encryption.enabled": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
        },
        "encryption.activeMasterKeyId": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "encryption.passwordCache": {
            value: {},
            type: types_1.SettingItemType.Object,
            public: false,
            secure: true,
        },
        "encryption.masterPassword": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            secure: true,
        },
        "encryption.shouldReencrypt": {
            value: -1, // will be set on app startup
            type: types_1.SettingItemType.Int,
            public: false,
        },
        // Holds the no-longer-published PPK from before a migration. This allows accepting
        // shares that target the old PPK.
        "encryption.cachedPpk": {
            value: {},
            type: types_1.SettingItemType.Object,
            public: false,
        },
        "sync.userId": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        // Deprecated in favour of windowContentZoomFactor
        "style.zoom": {
            value: 100,
            type: types_1.SettingItemType.Int,
            public: false,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            appTypes: [types_1.AppType.Desktop],
            section: "appearance",
            label: () => "",
            minimum: 50,
            maximum: 500,
            step: 10,
        },
        "style.viewer.fontSize": {
            value: 16,
            type: types_1.SettingItemType.Int,
            public: true,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            appTypes: [types_1.AppType.Mobile],
            section: "appearance",
            label: () => (0, locale_1._)("Viewer font size"),
            minimum: 4,
            maximum: 50,
            step: 1,
        },
        "style.editor.fontSize": {
            value: 15,
            type: types_1.SettingItemType.Int,
            public: true,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            section: "appearance",
            label: () => (0, locale_1._)("Editor font size"),
            minimum: 4,
            maximum: 50,
            step: 1,
        },
        "style.editor.fontFamily": mobilePlatform
            ? {
                value: Setting.FONT_DEFAULT,
                type: types_1.SettingItemType.String,
                isEnum: true,
                public: true,
                label: () => (0, locale_1._)("Editor font"),
                appTypes: [types_1.AppType.Mobile],
                section: "appearance",
                options: () => {
                    // IMPORTANT: The font mapping must match the one in global-styles.js::editorFont()
                    if (mobilePlatform === "ios") {
                        return {
                            [Setting.FONT_DEFAULT]: (0, locale_1._)("Default"),
                            [Setting.FONT_MENLO]: "Menlo",
                            [Setting.FONT_COURIER_NEW]: "Courier New",
                            [Setting.FONT_AVENIR]: "Avenir",
                        };
                    }
                    return {
                        [Setting.FONT_DEFAULT]: (0, locale_1._)("Default"),
                        [Setting.FONT_MONOSPACE]: "Monospace",
                    };
                },
                storage: types_1.SettingStorage.File,
                isGlobal: true,
            }
            : {
                value: "",
                type: types_1.SettingItemType.String,
                public: true,
                appTypes: [types_1.AppType.Desktop],
                section: "appearance",
                label: () => (0, locale_1._)("Editor font family"),
                description: () => (0, locale_1._)("Used for most text in the markdown editor. If not found, a generic proportional (variable width) font is used."),
                storage: types_1.SettingStorage.File,
                isGlobal: true,
                subType: types_1.SettingItemSubType.FontFamily,
            },
        "style.editor.monospaceFontFamily": {
            value: "",
            type: types_1.SettingItemType.String,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            section: "appearance",
            label: () => (0, locale_1._)("Editor monospace font family"),
            description: () => (0, locale_1._)("Used where a fixed width font is needed to lay out text legibly (e.g. tables, checkboxes, code). If not found, a generic monospace (fixed width) font is used."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            subType: types_1.SettingItemSubType.MonospaceFontFamily,
        },
        "style.viewer.fontFamily": {
            value: "",
            type: types_1.SettingItemType.String,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            section: "appearance",
            label: () => (0, locale_1._)("Viewer and Rich Text Editor font family"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            subType: types_1.SettingItemSubType.FontFamily,
        },
        "style.editor.contentMaxWidth": {
            value: 0,
            type: types_1.SettingItemType.Int,
            public: true,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            appTypes: [types_1.AppType.Desktop],
            section: "appearance",
            label: () => (0, locale_1._)("Editor maximum width"),
            description: () => (0, locale_1._)("Set it to 0 to make it take the complete available space. Recommended width is 600."),
        },
        "style.scrollbarSize": {
            value: ScrollbarSize.Small,
            type: types_1.SettingItemType.String,
            public: true,
            section: "appearance",
            appTypes: [types_1.AppType.Desktop],
            isEnum: true,
            options: () => ({
                [ScrollbarSize.Small]: (0, locale_1._)("Small"),
                [ScrollbarSize.Medium]: (0, locale_1._)("Medium"),
                [ScrollbarSize.Large]: (0, locale_1._)("Large"),
            }),
            label: () => (0, locale_1._)("Scrollbar size"),
            description: () => (0, locale_1._)("Configures the size of scrollbars used in the app."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "ui.layout": {
            value: {},
            type: types_1.SettingItemType.Object,
            storage: types_1.SettingStorage.File,
            isGlobal: false,
            public: false,
            appTypes: [types_1.AppType.Desktop],
        },
        "ui.lastSelectedPluginPanel": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            description: () => "The last selected plugin panel ID in pop-up mode (mobile).",
            storage: types_1.SettingStorage.Database,
            appTypes: [types_1.AppType.Mobile],
        },
        // TODO: Is there a better way to do this? The goal here is to simply have
        // a way to display a link to the customizable stylesheets, not for it to
        // serve as a customizable Setting. But because the Setting page is auto-
        // generated from this list of settings, there wasn't a really elegant way
        // to do that directly in the React markup.
        "style.customCss.renderedMarkdown": {
            value: null,
            onClick: () => {
                shim_1.default.openOrCreateFile(customCssFilePath(Setting, Setting.customCssFilenames.RENDERED_MARKDOWN), "/* For styling the rendered Markdown */");
            },
            type: types_1.SettingItemType.Button,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Custom stylesheet for rendered Markdown"),
            section: "appearance",
            advanced: true,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "style.customCss.joplinApp": {
            value: null,
            onClick: () => {
                shim_1.default.openOrCreateFile(customCssFilePath(Setting, Setting.customCssFilenames.JOPLIN_APP), `/* For styling the entire Joplin app (except the rendered Markdown, which is defined in \`${Setting.customCssFilenames.RENDERED_MARKDOWN}\`) */`);
            },
            type: types_1.SettingItemType.Button,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Custom stylesheet for Joplin-wide app styles"),
            section: "appearance",
            advanced: true,
            description: () => "CSS file support is provided for your convenience, but they are advanced settings, and styles you define may break from one version to the next. If you want to use them, please know that it might require regular development work from you to keep them working. The Joplin team cannot make a commitment to keep the application HTML structure stable.",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "sync.clearLocalSyncStateButton": {
            value: null,
            type: types_1.SettingItemType.Button,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Re-upload local data to sync target"),
            section: "sync",
            advanced: true,
            description: () => "If the data on the sync target is incorrect or empty, you can use this button to force a re-upload of your data to the sync target. Application will have to be restarted",
        },
        "sync.clearLocalDataButton": {
            value: null,
            type: types_1.SettingItemType.Button,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Delete local data and re-download from sync target"),
            section: "sync",
            advanced: true,
            description: () => "If the data on the sync target is correct but your local data is not, you can use this button to clear your local data and force re-downloading everything from the sync target. As your local data will be deleted first, it is recommended to export your data as JEX first. Application will have to be restarted",
        },
        autoUpdateEnabled: {
            value: true,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            section: "application",
            public: platform !== "linux",
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Automatically check for updates"),
        },
        "autoUpdate.includePreReleases": {
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "application",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Get pre-releases when checking for updates"),
            description: () => (0, locale_1._)("See the pre-release page for more details: %s", "https://joplinapp.org/help/about/prereleases"),
        },
        autoUploadCrashDumps: {
            value: false,
            section: "application",
            type: types_1.SettingItemType.Bool,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Automatically upload crash reports",
            description: () => "If you experience a crash, please enable this option to automatically send crash reports. You will need to restart the application for this change to take effect.",
            isGlobal: true,
            storage: types_1.SettingStorage.File,
        },
        "clipperServer.autoStart": {
            value: false,
            type: types_1.SettingItemType.Bool,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: false,
        },
        "sync.interval": {
            value: 300,
            type: types_1.SettingItemType.Int,
            section: "sync",
            isEnum: true,
            public: true,
            label: () => (0, locale_1._)("Synchronisation interval"),
            options: () => {
                return {
                    0: (0, locale_1._)("Disabled"),
                    300: (0, locale_1._n)("%d minute", "%d minutes", 5, 5),
                    600: (0, locale_1._n)("%d minute", "%d minutes", 10, 10),
                    1800: (0, locale_1._n)("%d minute", "%d minutes", 30, 30),
                    3600: (0, locale_1._n)("%d hour", "%d hours", 1, 1),
                    43200: (0, locale_1._n)("%d hour", "%d hours", 12, 12),
                    86400: (0, locale_1._n)("%d hour", "%d hours", 24, 24),
                };
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "sync.mobileWifiOnly": {
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "sync",
            public: true,
            label: () => (0, locale_1._)("Synchronise only over WiFi connection"),
            storage: types_1.SettingStorage.File,
            appTypes: [types_1.AppType.Mobile],
            isGlobal: true,
        },
        noteVisiblePanes: {
            value: ["editor", "viewer"],
            type: types_1.SettingItemType.Array,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: false,
            appTypes: [types_1.AppType.Desktop],
        },
        tagHeaderIsExpanded: {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Desktop],
        },
        folderHeaderIsExpanded: {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Desktop],
        },
        editor: {
            value: "",
            type: types_1.SettingItemType.String,
            subType: "file_path_and_args",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: true,
            appTypes: [types_1.AppType.Cli, types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Text editor command"),
            description: () => (0, locale_1._)("The editor command (may include arguments) that will be used to open a note. If none is provided it will try to auto-detect the default editor."),
        },
        "export.pdfPageSize": {
            value: "A4",
            type: types_1.SettingItemType.String,
            advanced: true,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Page size for PDF export"),
            options: () => {
                return {
                    A4: (0, locale_1._)("A4"),
                    Letter: (0, locale_1._)("Letter"),
                    A3: (0, locale_1._)("A3"),
                    A5: (0, locale_1._)("A5"),
                    Tabloid: (0, locale_1._)("Tabloid"),
                    Legal: (0, locale_1._)("Legal"),
                };
            },
        },
        "export.pdfPageOrientation": {
            value: "portrait",
            type: types_1.SettingItemType.String,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            advanced: true,
            isEnum: true,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Page orientation for PDF export"),
            options: () => {
                return {
                    portrait: (0, locale_1._)("Portrait"),
                    landscape: (0, locale_1._)("Landscape"),
                };
            },
        },
        useCustomPdfViewer: {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            advanced: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Use custom PDF viewer (Beta)",
            description: () => "The custom PDF viewer remembers the last page that was viewed, however it has some technical issues.",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.keyboardMode": {
            value: "",
            type: types_1.SettingItemType.String,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            isEnum: true,
            advanced: true,
            label: () => (0, locale_1._)("Keyboard Mode"),
            options: () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const output = {};
                output[""] = (0, locale_1._)("Default");
                output["emacs"] = (0, locale_1._)("Emacs");
                output["vim"] = (0, locale_1._)("Vim");
                return output;
            },
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.spellcheckBeta": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Enable spell checking in Markdown editor"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.inlineRendering": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Markdown editor: Render markup in editor"),
            description: () => (0, locale_1._)("Renders markup on all lines that don't include the cursor."),
            section: "note",
            storage: types_1.SettingStorage.File,
        },
        "editor.imageRendering": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Markdown editor: Render images"),
            description: () => (0, locale_1._)("If an image attachment is on its own line and followed by a blank line, it will be rendered just below its Markdown source."),
            section: "note",
            storage: types_1.SettingStorage.File,
        },
        "editor.highlightActiveLine": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            section: "note",
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Markdown editor: Highlight active line"),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "imageeditor.jsdrawToolbar": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Mobile],
            label: () => "",
            storage: types_1.SettingStorage.File,
        },
        "imageeditor.imageTemplate": {
            value: "{ }",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Mobile],
            label: () => "Template for the image editor",
            storage: types_1.SettingStorage.File,
        },
        // 2023-09-07: This setting is now used to track the desktop beta editor. It
        // was used to track the mobile beta editor previously.
        "editor.beta": {
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "general",
            public: false,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Opt-in to the editor beta",
            description: () => "Currently unused",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "editor.legacyMarkdown": {
            advanced: true,
            value: false,
            type: types_1.SettingItemType.Bool,
            section: "general",
            public: true,
            appTypes: [types_1.AppType.Desktop],
            label: () => (0, locale_1._)("Use the legacy Markdown editor"),
            description: () => "Enable the the legacy Markdown editor. Some plugins require this editor to function. However, it has accessibility issues and other plugins will not work.",
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "linking.extraAllowedExtensions": {
            value: [],
            type: types_1.SettingItemType.Array,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Additional file types that can be opened without confirmation.",
            storage: types_1.SettingStorage.File,
        },
        "net.customCertificates": {
            value: "",
            type: types_1.SettingItemType.String,
            section: "sync",
            advanced: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return ([
                    SyncTargetRegistry_1.default.nameToId("amazon_s3"),
                    SyncTargetRegistry_1.default.nameToId("nextcloud"),
                    SyncTargetRegistry_1.default.nameToId("webdav"),
                    SyncTargetRegistry_1.default.nameToId("joplinServer"),
                ].indexOf(settings["sync.target"]) >= 0);
            },
            public: true,
            appTypes: [types_1.AppType.Desktop, types_1.AppType.Cli],
            label: () => (0, locale_1._)("Custom TLS certificates"),
            description: () => (0, locale_1._)('Comma-separated list of paths to directories to load the certificates from, or path to individual cert files. For example: /my/cert_dir, /other/custom.pem. Note that if you make changes to the TLS settings, you must save your changes before clicking on "Check synchronisation configuration".'),
            storage: types_1.SettingStorage.File,
        },
        "net.ignoreTlsErrors": {
            value: false,
            type: types_1.SettingItemType.Bool,
            advanced: true,
            section: "sync",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => {
                return ((shim_1.default.isNode() || shim_1.default.mobilePlatform() === "android") &&
                    [
                        SyncTargetRegistry_1.default.nameToId("amazon_s3"),
                        SyncTargetRegistry_1.default.nameToId("nextcloud"),
                        SyncTargetRegistry_1.default.nameToId("webdav"),
                        SyncTargetRegistry_1.default.nameToId("joplinServer"),
                        SyncTargetRegistry_1.default.nameToId("joplinServerSaml"),
                        // Needs to be enabled for Joplin Cloud too because
                        // some companies filter all traffic and swap TLS
                        // certificates, which result in error
                        // UNABLE_TO_GET_ISSUER_CERT_LOCALLY
                        SyncTargetRegistry_1.default.nameToId("joplinCloud"),
                    ].indexOf(settings["sync.target"]) >= 0);
            },
            public: true,
            label: () => (0, locale_1._)("Ignore TLS certificate errors"),
            storage: types_1.SettingStorage.File,
        },
        "net.proxyEnabled": {
            value: false,
            type: types_1.SettingItemType.Bool,
            advanced: true,
            section: "sync",
            isGlobal: true,
            public: true,
            label: () => (0, locale_1._)("Proxy enabled"),
            storage: types_1.SettingStorage.File,
        },
        "net.proxyUrl": {
            value: "",
            type: types_1.SettingItemType.String,
            advanced: true,
            section: "sync",
            isGlobal: true,
            public: true,
            label: () => (0, locale_1._)("Proxy URL"),
            description: () => (0, locale_1._)('For example "%s"', "http://my.proxy.com:80"),
            storage: types_1.SettingStorage.File,
        },
        "net.proxyTimeout": {
            value: 1,
            type: types_1.SettingItemType.Int,
            maximum: 60,
            advanced: true,
            section: "sync",
            isGlobal: true,
            public: true,
            label: () => (0, locale_1._)("Proxy timeout (seconds)"),
            storage: types_1.SettingStorage.File,
        },
        "sync.wipeOutFailSafe": {
            value: true,
            type: types_1.SettingItemType.Bool,
            advanced: true,
            public: true,
            section: "sync",
            label: () => (0, locale_1._)("Fail-safe"),
            description: () => (0, locale_1._)("Fail-safe: Do not wipe out local data when sync target is empty (often the result of a misconfiguration or bug)"),
            storage: types_1.SettingStorage.File,
        },
        "api.token": {
            value: null,
            type: types_1.SettingItemType.String,
            public: false,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "api.port": {
            value: null,
            type: types_1.SettingItemType.Int,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
            public: true,
            appTypes: [types_1.AppType.Cli],
            description: () => (0, locale_1._)("Specify the port that should be used by the API server. If not set, a default will be used."),
        },
        "resourceService.lastProcessedChangeId": {
            value: 0,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "searchEngine.lastProcessedChangeId": {
            value: 0,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "revisionService.lastProcessedChangeId": {
            value: 0,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "searchEngine.initialIndexingDone": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
        },
        "searchEngine.lastProcessedResource": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        "revisionService.enabled": {
            section: "revisionService",
            storage: types_1.SettingStorage.File,
            value: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            label: () => (0, locale_1._)("Enable note history"),
        },
        "revisionService.ttlDays": {
            section: "revisionService",
            value: 90,
            type: types_1.SettingItemType.Int,
            public: true,
            minimum: 1,
            maximum: 99999,
            step: 1,
            unitLabel: (value = null) => {
                return value === null
                    ? (0, locale_1._)("days")
                    : (0, locale_1._n)("%d day", "%d days", value, value);
            },
            label: () => (0, locale_1._)("Keep note history for"),
            storage: types_1.SettingStorage.File,
        },
        "revisionService.intervalBetweenRevisions": {
            section: "revisionService",
            value: 1000 * 60 * 10,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "revisionService.oldNoteInterval": {
            section: "revisionService",
            value: 1000 * 60 * 60 * 24 * 7,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "welcome.wasBuilt": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
        },
        "welcome.enabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: false,
        },
        "camera.type": {
            value: CameraDirection.Back,
            type: types_1.SettingItemType.Int,
            public: false,
            appTypes: [types_1.AppType.Mobile],
        },
        "camera.ratio": {
            value: "4:3",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Mobile],
        },
        "spellChecker.enabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            isGlobal: true,
            storage: types_1.SettingStorage.File,
            public: false,
        },
        "spellChecker.language": {
            value: "",
            type: types_1.SettingItemType.String,
            isGlobal: true,
            storage: types_1.SettingStorage.File,
            public: false,
        }, // Depreciated in favour of spellChecker.languages.
        "spellChecker.languages": {
            value: [],
            type: types_1.SettingItemType.Array,
            isGlobal: true,
            storage: types_1.SettingStorage.File,
            public: false,
        },
        windowContentZoomFactor: {
            value: 100,
            type: types_1.SettingItemType.Int,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            minimum: 30,
            maximum: 300,
            step: 10,
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "layout.folderList.factor": {
            value: 1,
            type: types_1.SettingItemType.Int,
            section: "appearance",
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Notebook list growth factor"),
            description: () => (0, locale_1._)("The factor property sets how the item will grow or shrink " +
                "to fit the available space in its container with respect to the other items. " +
                "Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1." +
                "Restart app to see changes."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "layout.noteList.factor": {
            value: 1,
            type: types_1.SettingItemType.Int,
            section: "appearance",
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Note list growth factor"),
            description: () => (0, locale_1._)("The factor property sets how the item will grow or shrink " +
                "to fit the available space in its container with respect to the other items. " +
                "Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1." +
                "Restart app to see changes."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        "layout.note.factor": {
            value: 2,
            type: types_1.SettingItemType.Int,
            section: "appearance",
            public: true,
            appTypes: [types_1.AppType.Cli],
            label: () => (0, locale_1._)("Note area growth factor"),
            description: () => (0, locale_1._)("The factor property sets how the item will grow or shrink " +
                "to fit the available space in its container with respect to the other items. " +
                "Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1." +
                "Restart app to see changes."),
            storage: types_1.SettingStorage.File,
            isGlobal: true,
        },
        syncInfoCache: {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
        },
        isSafeMode: {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Desktop],
            storage: types_1.SettingStorage.Database,
        },
        lastSettingDefaultMigration: {
            value: -1,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        lastSettingGlobalMigration: {
            value: -1,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        wasClosedSuccessfully: {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: false,
        },
        installedDefaultPlugins: {
            value: [],
            type: types_1.SettingItemType.Array,
            public: false,
            storage: types_1.SettingStorage.Database,
        },
        // The biometrics feature is disabled by default and marked as beta
        // because it seems to cause a freeze or slow down startup on
        // certain devices. May be the reason for:
        //
        // - https://discourse.joplinapp.org/t/on-android-when-joplin-gets-started-offline/29951/1
        // - https://github.com/laurent22/joplin/issues/7956
        "security.biometricsEnabled": {
            value: false,
            type: types_1.SettingItemType.Bool,
            label: () => `${(0, locale_1._)("Use biometrics to secure access to the app")}${shim_1.default.mobilePlatform() !== "ios" ? " (Beta)" : ""}`,
            description: () => "Important: This is a beta feature and it is not compatible with certain devices. If the app no longer starts after enabling this or is very slow to start, please uninstall and reinstall the app.",
            show: () => shim_1.default.mobilePlatform() !== "web",
            public: true,
            appTypes: [types_1.AppType.Mobile],
        },
        "security.biometricsSupportedSensors": {
            value: "",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Mobile],
        },
        "security.biometricsInitialPromptDone": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: false,
            appTypes: [types_1.AppType.Mobile],
        },
        "featureFlag.autoUpdaterServiceEnabled": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            storage: types_1.SettingStorage.File,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Enable auto-updates",
            description: () => "Enable this feature to receive notifications about updates and install them instead of manually downloading them. Restart app to start receiving auto-updates.",
            show: () => shim_1.default.isWindows(),
            section: "application",
            isGlobal: true,
        },
        "featureFlag.linuxKeychain": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            storage: types_1.SettingStorage.File,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Enable keychain support",
            description: () => "This is an experimental setting to enable keychain support on Linux",
            show: () => shim_1.default.isLinux(),
            section: "general",
            isGlobal: true,
            advanced: true,
        },
        // 'featureFlag.syncAccurateTimestamps': {
        // 	value: false,
        // 	type: SettingItemType.Bool,
        // 	public: false,
        // 	storage: SettingStorage.File,
        // },
        // 'featureFlag.syncMultiPut': {
        // 	value: false,
        // 	type: SettingItemType.Bool,
        // 	public: false,
        // 	storage: SettingStorage.File,
        // },
        "featureFlag.richText.useStrictContentSecurityPolicy": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            storage: types_1.SettingStorage.File,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Security: Stronger security controls in the Rich Text Editor",
            description: () => "Improves Rich Text Editor security by applying a strict content security policy to the Rich Text Editor's content.",
            section: "note",
            isGlobal: true,
        },
        "featureFlag.plugins.isolatePluginWebViews": {
            value: false,
            type: types_1.SettingItemType.Bool,
            public: true,
            storage: types_1.SettingStorage.File,
            appTypes: [types_1.AppType.Desktop],
            label: () => "Security: Improve plugin panel, editor, and dialog security",
            description: () => "Improves the security of plugin WebViews. This may break some plugins.",
            section: "note",
            isGlobal: true,
        },
        "survey.webClientEval2025.progress": {
            value: SurveyProgress.NotStarted,
            type: types_1.SettingItemType.Int,
            public: false,
            isEnum: true,
            storage: types_1.SettingStorage.File,
            options: () => ({
                [SurveyProgress.NotStarted]: "Not started",
                [SurveyProgress.Started]: "Started",
                [SurveyProgress.Dismissed]: "Done",
            }),
            label: () => "Show web client evaluation survey",
            isGlobal: true,
        },
        "sync.allowUnsupportedProviders": {
            value: -1,
            type: types_1.SettingItemType.Int,
            public: false,
        },
        "sync.shareCache": {
            value: null,
            type: types_1.SettingItemType.String,
            public: false,
        },
        voiceTypingBaseUrl: {
            value: "",
            type: types_1.SettingItemType.String,
            public: true,
            appTypes: [types_1.AppType.Mobile],
            description: () => (0, locale_1._)("Leave it blank to download the language files from the default website"),
            label: () => (0, locale_1._)("Voice typing language files (URL)"),
            show: showVoiceTypingSettings,
            section: "note",
        },
        // Deprecated and currently unused. For now, the mobile app only supports the Whisper voice typing provider.
        "voiceTyping.preferredProvider": {
            value: "whisper-tiny",
            type: types_1.SettingItemType.String,
            public: false,
            appTypes: [types_1.AppType.Mobile],
            label: () => "Preferred voice typing provider",
            isEnum: true,
            show: showVoiceTypingSettings,
            section: "note",
            options: () => {
                return {
                    vosk: "Vosk", // No longer supported
                    "whisper-tiny": "Whisper",
                };
            },
        },
        "voiceTyping.glossary": {
            value: "",
            type: types_1.SettingItemType.String,
            public: true,
            appTypes: [types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Voice typing: Glossary"),
            description: () => (0, locale_1._)("A comma-separated list of words. May be used for uncommon words, to help voice typing spell them correctly."),
            show: () => showVoiceTypingSettings(),
            section: "note",
        },
        "scanner.titleTemplate": {
            value: "Scan: {date} ({count})",
            type: types_1.SettingItemType.String,
            public: true,
            appTypes: [types_1.AppType.Mobile],
            label: () => (0, locale_1._)("Document scanner: Title template"),
            description: () => (0, locale_1._)("Default title to use for documents created by the scanner."),
            section: "note",
        },
        "scanner.requestTranscription": {
            value: false,
            type: types_1.SettingItemType.Bool,
            label: () => 'Default value for the "queue for transcription" checkbox',
            public: false,
            appTypes: [types_1.AppType.Mobile],
        },
        "trash.autoDeletionEnabled": {
            value: true,
            type: types_1.SettingItemType.Bool,
            public: true,
            label: () => (0, locale_1._)("Automatically delete notes in the trash after a number of days"),
            storage: types_1.SettingStorage.File,
            isGlobal: false,
        },
        "trash.ttlDays": {
            value: 90,
            type: types_1.SettingItemType.Int,
            public: true,
            minimum: 1,
            maximum: 300,
            step: 1,
            unitLabel: (value = null) => {
                return value === null
                    ? (0, locale_1._)("days")
                    : (0, locale_1._n)("%d day", "%d days", value, value);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            show: (settings) => settings["trash.autoDeletionEnabled"],
            label: () => (0, locale_1._)("Keep notes in the trash for"),
            storage: types_1.SettingStorage.File,
            isGlobal: false,
        },
    };
    for (const [key, md] of Object.entries(output)) {
        if (key.startsWith("featureFlag."))
            md.advanced = true;
    }
    return output;
};
exports.default = builtInMetadata;
