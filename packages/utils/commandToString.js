"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quotePath = (path) => {
    if (!path)
        return '';
    if (path.indexOf('"') < 0 && path.indexOf(' ') < 0)
        return path;
    path = path.replace(/"/, '\\"');
    return `"${path}"`;
};
exports.default = (commandName, args = []) => {
    const output = [quotePath(commandName)];
    for (const arg of args) {
        output.push(quotePath(arg));
    }
    return output.join(' ').trim();
};
//# sourceMappingURL=commandToString.js.map