import HtmlUtils from '@joplin/lib/htmlUtils';

export default function(htmlContent: string) {
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
