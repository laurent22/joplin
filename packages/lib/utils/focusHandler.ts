// The purpose of this handler is to have all focus/blur calls go through the same place, which
// makes it easier to log what happens. This is useful when one unknown component is stealing focus
// from another component. Potentially it could also be used to resolve conflict situations when
// multiple components try to set the focus at the same time.

import Logger from '@joplin/utils/Logger';

const logger = Logger.create('focusHandler');

enum ToggleFocusAction {
	Focus = 'focus',
	Blur = 'blur',
}

interface FocusOptions {
	preventScroll: boolean;
}

type MaybeFocusable = {
	focus?: (...args: unknown[])=> void;
	blur?: (...args: unknown[])=> void;
};

const toggleFocus = (source: string, element: unknown, action: ToggleFocusAction, options: FocusOptions|null) => {
	if (!element) {
		logger.warn(`Tried action "${action}" on an undefined element: ${source}`);
		return;
	}

	const focusable = element as MaybeFocusable;
	const fn = focusable[action];
	if (typeof fn !== 'function') {
		logger.warn(`Element does not have a "${action}" method: ${source}`);
		return;
	}

	logger.debug(`Action "${action}" from "${source}"`);
	if (options) {
		fn.call(focusable, options);
	} else {
		fn.call(focusable);
	}
};

export const focus = (source: string, element: unknown, options: FocusOptions|null = null) => {
	toggleFocus(source, element, ToggleFocusAction.Focus, options);
};

export const blur = (source: string, element: unknown) => {
	toggleFocus(source, element, ToggleFocusAction.Blur, null);
};
