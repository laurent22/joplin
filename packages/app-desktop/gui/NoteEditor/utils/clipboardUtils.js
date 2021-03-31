'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.copyHtmlToClipboard = exports.getCopyableContent = void 0;
const htmlUtils_1 = require('@joplin/lib/htmlUtils');
const { clipboard } = require('electron');
function getCopyableContent(htmlContent) {
	// We need to remove extra url params from the image URLs while copying
	// because some offline edtors do not show the image if there is
	// an extra parameter in it's path.
	// Related to - https://github.com/laurent22/joplin/issues/4602
	const removeParametersFromUrl = (url) => {
		const imageSrc = new URL(url);
		// Remove parameters if it's a local image.
		if (imageSrc.protocol === 'file:') {
			imageSrc.search = '';
		}
		return imageSrc.toString();
	};
	return htmlUtils_1.default.replaceImageUrls(htmlContent, removeParametersFromUrl);
}
exports.getCopyableContent = getCopyableContent;
function copyHtmlToClipboard(copiedHtml) {
	const copyableContent = getCopyableContent(copiedHtml);
	// In that case we need to set both HTML and Text context, otherwise it
	// won't be possible to paste the text in, for example, a text editor.
	// https://github.com/laurent22/joplin/issues/4788
	clipboard.write({
		text: htmlUtils_1.default.stripHtml(copyableContent),
		html: copyableContent,
	});
}
exports.copyHtmlToClipboard = copyHtmlToClipboard;
// # sourceMappingURL=clipboardUtils.js.map
