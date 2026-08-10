import addFormattingClasses from './addFormattingClasses';
import replaceBackslashEscapes from './replaceBackslashEscapes';
import replaceBulletLists from './replaceBulletLists';
import replaceCheckboxes from './replaceCheckboxes';
import replaceDividers from './replaceDividers';
import replaceFormatCharacters from './replaceFormatCharacters';
import replaceInlineHtml from './replaceInlineHtml';
import renderTables from './renderTables';
import replaceLinks from './replaceLinks';
import { RenderedContentContext } from './types';

export default (context: RenderedContentContext, tableEditingEnabled = true) => {
	return [
		replaceCheckboxes,
		replaceBulletLists,
		replaceFormatCharacters,
		replaceLinks,
		replaceBackslashEscapes,
		replaceDividers,
		addFormattingClasses,
		replaceInlineHtml,
		...(tableEditingEnabled ? [renderTables(context)] : []),
	];
};
