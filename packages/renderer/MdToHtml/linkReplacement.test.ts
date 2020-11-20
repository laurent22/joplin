import linkReplacement from './linkReplacement';

describe('linkReplacement', () => {

	test('should handle non-resource links', () => {
		const r = linkReplacement('https://example.com/test');
		expect(r).toBe('<a data-from-md href=\'https://example.com/test\' onclick=\'postMessage("https://example.com/test", { resourceId: "" }); return false;\'>');
	});

	test('should handle non-resource links - simple rendering', () => {
		const r = linkReplacement('https://example.com/test', { linkRenderingType: 2 });
		expect(r).toBe('<a data-from-md href=\'https://example.com/test\'>');
	});

	test('should handle resource links - downloaded status', () => {
		const resourceId = 'f6afba55bdf74568ac94f8d1e3578d2c';

		const r = linkReplacement(`:/${resourceId}`, {
			ResourceModel: {},
			resources: {
				[resourceId]: {
					item: {},
					localState: {
						fetch_status: 2, // FETCH_STATUS_DONE
					},
				},
			},
		});

		expect(r).toBe(`<a data-from-md data-resource-id='${resourceId}' href='#' onclick='postMessage("joplin://${resourceId}", { resourceId: "${resourceId}" }); return false;'><span class="resource-icon fa-joplin"></span>`);
	});

	test('should handle resource links - idle status', () => {
		const resourceId = 'f6afba55bdf74568ac94f8d1e3578d2c';

		const r = linkReplacement(`:/${resourceId}`, {
			ResourceModel: {},
			resources: {
				[resourceId]: {
					item: {},
					localState: {
						fetch_status: 0, // FETCH_STATUS_IDLE
					},
				},
			},
		});

		// Since the icon is embedded as SVG, we only check for the prefix
		const expectedPrefix = `<a class="not-loaded-resource resource-status-notDownloaded" data-resource-id="${resourceId}"><img src="data:image/svg+xml;utf8`;
		expect(r.indexOf(expectedPrefix)).toBe(0);
	});

});
