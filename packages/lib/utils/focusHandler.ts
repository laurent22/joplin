// The purpose of this handler is to have all focus/blur calls go through the same place, which
// makes it easier to log what happens. This is useful when one unknown component is stealing focus
// from another component. Potentially it could also be used to resolve conflict situations when
// multiple components try to set the focus at the same time.

import Logger from '@joplin/utils/Logger';

const logger = Logger.create('setFocus');

enum ToggleFocusAction {
	Focus = 'focus',
	Blur = 'blur',
}

interface FocusableElement {
	focus: ()=> void;
	blur: ()=> void;
}

const toggleFocus = (source: string, element: FocusableElement, action: ToggleFocusAction) => {
	if (!element) {
		logger.warn(`Tried action "${action}" on an undefined element: ${source}`);
		return;
	}

	if (!element[action]) {
		logger.warn(`Element does not have a "${action}" method: ${source}`);
		return;
	}

	logger.debug(`Action "${action}" from "${source}"`);
	element[action]();
};

export const focus = (source: string, element: any) => {
	toggleFocus(source, element, ToggleFocusAction.Focus);
};

export const blur = (source: string, element: any) => {
	toggleFocus(source, element, ToggleFocusAction.Blur);
};
