"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Populate a View object with some good defaults.
function default_1(name, title) {
    const pathPrefix = name.startsWith('admin/') ? '' : 'index/';
    return {
        name: name,
        path: `${pathPrefix}/${name}`,
        content: {},
        navbar: true,
        title: title,
        jsFiles: [],
        cssFiles: [],
    };
}
exports.default = default_1;
//# sourceMappingURL=defaultView.js.map