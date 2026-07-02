import addFormattingClasses from './addFormattingClasses';
import replaceBackslashEscapes from './replaceBackslashEscapes';
import replaceBulletLists from './replaceBulletLists';
import replaceCheckboxes from './replaceCheckboxes';
import replaceDividers from './replaceDividers';
import replaceFormatCharacters from './replaceFormatCharacters';
import replaceInlineHtml from './replaceInlineHtml';
import renderTables from './renderTables';
import replaceLinks from './replaceLinks';

export default (tableEditingEnabled = true) => {
	return [
		replaceCheckboxes,
		replaceBulletLists,
		replaceFormatCharacters,
		replaceLinks,
		replaceBackslashEscapes,
		replaceDividers,
		addFormattingClasses,
		replaceInlineHtml,
		...(tableEditingEnabled ? [renderTables] : []),
	];
};
