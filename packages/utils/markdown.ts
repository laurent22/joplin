/* eslint-disable import/prefer-default-export */

import * as MarkdownIt from 'markdown-it';
import { Link } from './types';

// enable file link URLs in MarkdownIt. Keeps other URL restrictions of
// MarkdownIt untouched. Format [link name](file://...)
const validateLinks = (url: string) => {
	const BAD_PROTO_RE = /^(vbscript|javascript|data):/;
	const GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;

	// url should be normalized at this point, and existing entities are decoded
	const str = url.trim().toLowerCase();

	if (str.indexOf('data:image/svg+xml,') === 0) {
		return true;
	}

	return BAD_PROTO_RE.test(str) ? (!!GOOD_DATA_RE.test(str)) : true;
};

// Note that the title is stripped of any Markdown code. So `title with
// **bold**` will become `title with bold`. Links are extracted both from
// Markdown and from HTML links.
export const extractUrls = (md: string): Link[] => {
	const markdownIt = new MarkdownIt();
	markdownIt.validateLink = validateLinks; // Necessary to support file:/// links

	const env = {};
	const tokens = markdownIt.parse(md, env);
	const output: Link[] = [];

	const searchUrls = (tokens: MarkdownIt.Token[], currentLink: Link|null) => {
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.type === 'link_open') {
				currentLink = {
					title: '',
					url: token.attrGet('href') || '',
				};
			} else if (token.type === 'link_close') {
				if (!currentLink) throw new Error('Found a link_close without a link_open');
				output.push(currentLink);
				currentLink = null;
			} else if (token.children && token.children.length) {
				searchUrls(token.children, currentLink);
			} else if (token.type === 'text' && currentLink) {
				currentLink.title += token.content;
			}
		}
	};

	searchUrls(tokens, null);

	// Definitely won't work in all cases but for our particular use case,
	// processing Markdown generated from ENEX documents, that should be enough.
	const htmlAnchorRegex = /<a[\s\S]*?href=["'](.*?)["'][\s\S]*?>(.*?)<\/a>/ig;
	let result;
	while ((result = htmlAnchorRegex.exec(md)) !== null) {
		output.push({
			url: result[1],
			title: result[2],
		});
	}

	return output;
};
