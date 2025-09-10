import addFormattingClasses from './addFormattingClasses';
import replaceBulletLists from './replaceBulletLists';
import replaceCheckboxes from './replaceCheckboxes';
import replaceDividers from './replaceDividers';
import replaceFormatCharacters from './replaceFormatCharacters';

export default () => {
	return [
		replaceCheckboxes,
		replaceBulletLists,
		replaceFormatCharacters,
		replaceDividers,
		addFormattingClasses,
	];
};
