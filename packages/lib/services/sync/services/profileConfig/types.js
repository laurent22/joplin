"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultProfileConfig = exports.defaultProfile = exports.CurrentProfileVersion = exports.DefaultProfileId = void 0;
exports.DefaultProfileId = 'default';
exports.CurrentProfileVersion = 2;
const defaultProfile = () => {
    return {
        name: 'Default',
        id: exports.DefaultProfileId,
    };
};
exports.defaultProfile = defaultProfile;
const defaultProfileConfig = () => {
    return {
        version: exports.CurrentProfileVersion,
        currentProfileId: exports.DefaultProfileId,
        profiles: [(0, exports.defaultProfile)()],
    };
};
exports.defaultProfileConfig = defaultProfileConfig;
