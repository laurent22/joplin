import HtmlUtils from '@joplin/lib/htmlUtils';
const { clipboard } = require('electron');

export function getCopyableContent(htmlContent: string): string {
	// We need to remove extra url params from the image URLs while copying
	// because some offline edtors do not show the image if there is
	// an extra parameter in it's path.
	// Related to - https://github.com/laurent22/joplin/issues/4602
	const removeParametersFromUrl = (url: string) => {
		const imageSrc = new URL(url);

		// Remove parameters if it's a local image.
		if (imageSrc.protocol === 'file:') {
			imageSrc.search = '';
		}

		return imageSrc.toString();
	};

	return HtmlUtils.replaceImageUrls(htmlContent, removeParametersFromUrl);
}

export function copyHtmlToClipboard(copiedHtml: string): void {
	const copyableContent = getCopyableContent(copiedHtml);

	// In that case we need to set both HTML and Text context, otherwise it
	// won't be possible to paste the text in, for example, a text editor.
	// https://github.com/laurent22/joplin/issues/4788
	clipboard.write({
		text: HtmlUtils.stripHtml(copyableContent),
		html: copyableContent,
	});
}
