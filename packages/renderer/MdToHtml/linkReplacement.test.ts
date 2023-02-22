import linkReplacement from './linkReplacement';
const { getClassNameForMimeType } = require('font-awesome-filetypes');
import { describe, test, expect } from '@jest/globals';

describe('linkReplacement', () => {

	test('should handle non-resource links', () => {
		const r = linkReplacement('https://example.com/test').html;
		expect(r).toBe('<a data-from-md href=\'https://example.com/test\' onclick=\'postMessage("https://example.com/test", { resourceId: "" }); return false;\'>');
	});

	test('should handle non-resource links - simple rendering', () => {
		const r = linkReplacement('https://example.com/test', { linkRenderingType: 2 }).html;
		expect(r).toBe('<a data-from-md href=\'https://example.com/test\'>');
	});

	test('should handle non-resource links with single quotes in it', () => {
		// Handles a link such as:
		// [Google](https://www.goo'onclick=javascript:alert(/1/);f=')
		const r = linkReplacement('https://www.goo\'onclick=javascript:alert(/1/);f=\'', { linkRenderingType: 1 }).html;
		expect(r).toBe('<a data-from-md href=\'https://www.goo&apos;onclick=javascript:alert(/1/);f=&apos;\' onclick=\'postMessage("https://www.goo%27onclick=javascript:alert(/1/);f=%27", { resourceId: "" }); return false;\'>');
	});

	test('should handle resource links - downloaded status', () => {
		const resourceId = 'f6afba55bdf74568ac94f8d1e3578d2c';
		const iconType = getClassNameForMimeType('application/pdf');

		const r = linkReplacement(`:/${resourceId}`, {
			ResourceModel: {},
			resources: {
				[resourceId]: {
					item: {
						title: 'Downloaded Resource',
						mime: 'application/pdf',
					},
					localState: {
						fetch_status: 2, // FETCH_STATUS_DONE
					},
				},
			},
		}).html;

		expect(r).toBe(`<a data-from-md data-resource-id='${resourceId}' title='Downloaded Resource' type='application/pdf' href='#' onclick='postMessage("joplin://${resourceId}", { resourceId: "${resourceId}" }); return false;'><span class="resource-icon ${iconType}"></span>`);
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
		}).html;

		// Since the icon is embedded as SVG, we only check for the prefix
		const expectedPrefix = `<a class="not-loaded-resource resource-status-notDownloaded" data-resource-id="${resourceId}"><img src="data:image/svg+xml;utf8`;
		expect(r.indexOf(expectedPrefix)).toBe(0);
	});

	test('should handle resource links - invalid link format', () => {
		const validResourceId 	 = 'f6afba55bdf74568ac94f8d1e3578d2c'; // 32 Chars

		const invalidResourceId1 = 'f6afba55bdf74568ac94f8d'; // < 32 Chars
		const invalidResourceTitle1 = ':/f6afba55bdf74568ac94f8d';

		const invalidResourceId2 = 'f6afba55bdf74568ac94f8d1e35dfs34v'; // > 32 Chars
		const invalidResourceTitle2 = ':/f6afba55bdf74568ac94f8d1e35dfs34v';

		const r1 = linkReplacement(`:/${invalidResourceId1}`, {
			title: invalidResourceTitle1,
			ResourceModel: {},
			resources: {
				[validResourceId]: {
					item: {},
					localState: {
						fetch_status: 0, // FETCH_STATUS_IDLE
					},
				},
			},
			postMessageSyntax: 'ipcProxySendToHost',
		}).html;

		const r2 = linkReplacement(`:/${invalidResourceId2}`, {
			title: invalidResourceTitle2,
			ResourceModel: {},
			resources: {
				[validResourceId]: {
					item: {},
					localState: {
						fetch_status: 0, // FETCH_STATUS_IDLE
					},
				},
			},
			postMessageSyntax: 'ipcProxySendToHost',
		}).html;

		expect(r1).toBe(`<a data-from-md title='${invalidResourceTitle1}' href='#' onclick='ipcProxySendToHost("${invalidResourceTitle1}", { resourceId: "" }); return false;'><span title="Invlaid resource id" class="resource-icon-error fa-exclamation-circle"></span>`);
		expect(r2).toBe(`<a data-from-md title='${invalidResourceTitle2}' href='#' onclick='ipcProxySendToHost("${invalidResourceTitle2}", { resourceId: "" }); return false;'><span title="Invlaid resource id" class="resource-icon-error fa-exclamation-circle"></span>`);
	});

	test('should handle resource links - non-existing resource id', () => {
		const existingResourceId 	= 'f6afba55bdf74568ac94f8d1e3578d2c'; // 32 Chars

		const nonExistingResourceId = 'f6afba55bdf74568ac94f8d1e3578bad';

		const r = linkReplacement(`:/${nonExistingResourceId}`, {
			title: '',
			ResourceModel: {},
			resources: {
				[existingResourceId]: {
					item: {},
					localState: {
						fetch_status: 2,
					},
				},
			},
			postMessageSyntax: 'ipcProxySendToHost',
			linkedNotes: ['badfba55bdf74568ac94f8d1e3578d2c', 'f6afba5sdef74568ac94f8d1e3578d2c'],
		}).html;

		expect(r).toBe(`<a data-from-md data-resource-id='${nonExistingResourceId}' href='#' onclick='ipcProxySendToHost("joplin://${nonExistingResourceId}", { resourceId: "${nonExistingResourceId}" }); return false;'><span title="File not found" class="resource-icon-error fa-exclamation-circle"></span>`);

	});

	test('should handle joplin note links', () => {
		const joplinNoteLink = 'baee37f69fed4417b4f11c50b28a2a42';

		const randomResourceId = 'f6afba55bdf74568ac94f8d1e3578bad';

		const r = linkReplacement(`:/${joplinNoteLink}`, {
			title: '',
			ResourceModel: {},
			resources: {
				[randomResourceId]: {
					item: {},
					localState: {
						fetch_status: 2,
					},
				},
			},
			postMessageSyntax: 'ipcProxySendToHost',
			linkedNotes: ['baee37f69fed4417b4f11c50b28a2a42', 'f6afba5sdef74568ac94f8d1e3578d2c'],
		}).html;

		expect(r).toBe(`<a data-from-md data-resource-id='${joplinNoteLink}' href='#' onclick='ipcProxySendToHost("joplin://${joplinNoteLink}", { resourceId: "${joplinNoteLink}" }); return false;'><span title="" class="resource-icon fa-joplin"></span>`);

	});


	test('should handle "file://" protocol links', () => {
		const fileURI = 'file://home/home/Desktop/Random.pdf';

		const randomResourceId = 'f6afba55bdf74568ac94f8d1e3578bad';

		const r = linkReplacement(`${fileURI}`, {
			title: fileURI,
			ResourceModel: {},
			resources: {
				[randomResourceId]: {
					item: {},
					localState: {
						fetch_status: 2,
					},
				},
			},
			postMessageSyntax: 'ipcProxySendToHost',
			linkedNotes: ['baee37f69fed4417b4f11c50b28a2a42', 'f6afba5sdef74568ac94f8d1e3578d2c'],
		}).html;

		expect(r).toBe(`<a data-from-md title='${fileURI}' href='#' onclick='ipcProxySendToHost("${fileURI}", { resourceId: "" }); return false;'><span class="resource-icon fa-file-pdf"></span>`);

	});

	test('should create ontouch listeners to handle longpress', () => {
		const resourceId = 'e6afba55bdf74568ac94f8d1e3578d2c';

		const linkHtml = linkReplacement(`:/${resourceId}`, {
			ResourceModel: {},
			resources: {
				[resourceId]: {
					item: {},
					localState: {
						fetch_status: 2, // FETCH_STATUS_DONE
					},
				},
			},
			enableLongPress: true,
		}).html;

		expect(linkHtml).toContain('ontouchstart');
		expect(linkHtml).toContain('ontouchend');
		expect(linkHtml).toContain('ontouchcancel');
	});
});
