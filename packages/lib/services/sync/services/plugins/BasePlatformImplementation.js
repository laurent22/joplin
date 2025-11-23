"use strict";
// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin
Object.defineProperty(exports, "__esModule", { value: true });
// API for all platforms, but with different implementations.
class BasePlatformImplementation {
    get versionInfo() {
        throw new Error('Not implemented: versionInfo');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    get clipboard() {
        throw new Error('Not implemented: clipboard');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    get nativeImage() {
        throw new Error('Not implemented: nativeImage');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    registerComponent(_name, _component) {
        throw new Error('Not implemented: registerComponent');
    }
    unregisterComponent(_name) {
        throw new Error('Not implemented: unregisterComponent');
    }
    get joplin() {
        throw new Error('Not implemented: joplin');
    }
    get imaging() {
        throw new Error('Not implemented: imaging');
    }
}
exports.default = BasePlatformImplementation;
