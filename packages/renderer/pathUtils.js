'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.toForwardSlashes = exports.fileExtension = exports.filename = exports.basename = exports.dirname = void 0;
function dirname(path) {
	if (!path) { throw new Error('Path is empty'); }
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
}
exports.dirname = dirname;
function basename(path) {
	if (!path) { throw new Error('Path is empty'); }
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
}
exports.basename = basename;
function filename(path, includeDir = false) {
	if (!path) { throw new Error('Path is empty'); }
	const output = includeDir ? path : basename(path);
	if (output.indexOf('.') < 0) { return output; }
	const splitted = output.split('.');
	splitted.pop();
	return splitted.join('.');
}
exports.filename = filename;
function fileExtension(path) {
	if (!path) { throw new Error('Path is empty'); }
	const output = path.split('.');
	if (output.length <= 1) { return ''; }
	return output[output.length - 1];
}
exports.fileExtension = fileExtension;
function toForwardSlashes(path) {
	return path.replace(/\\/g, '/');
}
exports.toForwardSlashes = toForwardSlashes;
// # sourceMappingURL=pathUtils.js.map
