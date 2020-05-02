'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const joplinRendererUtils = require('lib/joplin-renderer').utils;
const Resource = require('lib/models/Resource');
function resourcesStatus(resourceInfos) {
	let lowestIndex = joplinRendererUtils.resourceStatusIndex('ready');
	for (const id in resourceInfos) {
		const s = joplinRendererUtils.resourceStatus(Resource, resourceInfos[id]);
		const idx = joplinRendererUtils.resourceStatusIndex(s);
		if (idx < lowestIndex) { lowestIndex = idx; }
	}
	return joplinRendererUtils.resourceStatusName(lowestIndex);
}
exports.resourcesStatus = resourcesStatus;
// # sourceMappingURL=NoteText.js.map
