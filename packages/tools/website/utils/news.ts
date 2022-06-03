/* eslint-disable import/prefer-default-export */

import { MarkdownAndFrontMatter } from './frontMatter';
import { basename } from 'path';
const moment = require('moment');

export const getNewsDateString = (info: MarkdownAndFrontMatter, mdFilePath: string): string => {
	// If the date is set in the metadata, we get it from there. Otherwise we
	// derive it from the filename (eg. 20220224-release-2-7.md)

	if (info.created) {
		return moment(info.created).format('D MMM YYYY');
	} else {
		const filenameNoExt = basename(mdFilePath, '.md');
		const s = filenameNoExt.split('-');
		return moment(s[0], 'YYYYMMDD').format('D MMM YYYY');
	}
};
