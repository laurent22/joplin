import addFormattingClasses from './addFormattingClasses';
import renderBlockImages from './renderBlockImages';
import replaceBulletLists from './replaceBulletLists';
import replaceCheckboxes from './replaceCheckboxes';
import replaceDividers from './replaceDividers';
import replaceFormatCharacters from './replaceFormatCharacters';
import { RenderedContentContext } from './types';

interface Options {
	renderImages: boolean;
}

export default (context: RenderedContentContext, options: Options) => {
	return [
		replaceCheckboxes,
		replaceBulletLists,
		replaceFormatCharacters,
		replaceDividers,
		addFormattingClasses,
		...(options.renderImages ? [renderBlockImages(context)] : []),
	];
};
