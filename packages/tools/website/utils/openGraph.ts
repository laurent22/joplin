import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import { readmeFileTitleAndBody, replaceGitHubByWebsiteLinks } from './parser';
import markupLanguageUtils from '@joplin/lib/markupLanguageUtils';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

export interface OpenGraphTags {
	title: string;
	description: string;
	url: string;
	image?: string;
}

let markupToHtml_: MarkupToHtml = null;

const markupToHtml = (): MarkupToHtml => {
	if (!markupToHtml_) markupToHtml_ = new MarkupToHtml();
	return markupToHtml_;
};

const getImageUrl = (content: string): string | null => {
	const imageUrls = markupLanguageUtils.extractImageUrls(MarkupLanguage.Any, content);
	if (!imageUrls.length) return null;
	let imageUrl = replaceGitHubByWebsiteLinks(imageUrls[0]);
	if (!imageUrl.startsWith('https:')) {
		if (!imageUrl.startsWith('/')) imageUrl = `/${imageUrl}`;
		imageUrl = `https://joplinapp.org${imageUrl}`;
	}
	return imageUrl;
};

export const extractOpenGraphTags = async (sourcePath: string, url: string): Promise<OpenGraphTags> => {
	const doc = await readmeFileTitleAndBody(sourcePath);

	const output: OpenGraphTags = {
		title: substrWithEllipsis(doc.title, 0, 70),
		description: substrWithEllipsis(markupToHtml().stripMarkup(MarkupLanguage.Markdown, doc.body), 0, 200),
		url,
	};

	const imageUrl = getImageUrl(doc.body);

	if (imageUrl) output.image = imageUrl;

	return output;
};
