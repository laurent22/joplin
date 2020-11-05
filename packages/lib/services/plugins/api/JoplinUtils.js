'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
class JoplinUtils {
	escapeHtml(text) {
		return htmlentities(text);
	}
}
exports.default = JoplinUtils;
// # sourceMappingURL=JoplinUtils.js.map
