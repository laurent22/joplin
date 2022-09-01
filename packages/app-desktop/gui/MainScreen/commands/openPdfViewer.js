'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.runtime = exports.declaration = void 0;
const locale_1 = require('@joplin/lib/locale');
const Resource_1 = require('@joplin/lib/models/Resource');
exports.declaration = {
	name: 'openPdfViewer',
	label: () => locale_1._('Open PDF viewer'),
};
exports.runtime = () => {
	return {
		execute: (context, resourceId, pageNo) => __awaiter(void 0, void 0, void 0, function* () {
			const resource = yield Resource_1.default.load(resourceId);
			if (!resource) { throw new Error(`No such resource: ${resourceId}`); }
			if (resource.mime !== 'application/pdf') { throw new Error(`Not a PDF: ${resource.mime}`); }
			console.log('Opening PDF', resource);
			context.dispatch({
				type: 'DIALOG_OPEN',
				name: 'pdfViewer',
				props: {
					resource,
					pageNo: pageNo || 1,
				},
			});
		}),
	};
};
// # sourceMappingURL=openPdfViewer.js.map
