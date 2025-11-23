"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationType = exports.ApplicationPlatform = void 0;
var ApplicationPlatform;
(function (ApplicationPlatform) {
    ApplicationPlatform[ApplicationPlatform["Unknown"] = 0] = "Unknown";
    ApplicationPlatform[ApplicationPlatform["Windows"] = 1] = "Windows";
    ApplicationPlatform[ApplicationPlatform["Linux"] = 2] = "Linux";
    ApplicationPlatform[ApplicationPlatform["MacOs"] = 3] = "MacOs";
    ApplicationPlatform[ApplicationPlatform["Android"] = 4] = "Android";
    ApplicationPlatform[ApplicationPlatform["Ios"] = 5] = "Ios";
})(ApplicationPlatform || (exports.ApplicationPlatform = ApplicationPlatform = {}));
var ApplicationType;
(function (ApplicationType) {
    ApplicationType[ApplicationType["Unknown"] = 0] = "Unknown";
    ApplicationType[ApplicationType["Desktop"] = 1] = "Desktop";
    ApplicationType[ApplicationType["Mobile"] = 2] = "Mobile";
    ApplicationType[ApplicationType["Cli"] = 3] = "Cli";
})(ApplicationType || (exports.ApplicationType = ApplicationType = {}));
