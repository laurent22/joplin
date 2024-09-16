import { focus } from '@joplin/lib/utils/focusHandler';
import Logger from '@joplin/utils/Logger';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, UIManager, View, ViewProps } from 'react-native';

const logger = Logger.create('AccessibleView');

interface Props extends ViewProps {
	// Prevents a view from being interacted with by accessibility tools, the mouse, or the keyboard focus.
	// See https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert.
	inert?: boolean;

	// When refocusCounter changes, sets the accessibility focus to this view.
	// May require accessible={true}.
	refocusCounter?: number;
}

const AccessibleView: React.FC<Props> = ({ inert, refocusCounter, children, ...viewProps }) => {
	const [containerRef, setContainerRef] = useState<View|HTMLElement|null>(null);

	// On web, there's no clear way to disable keyboard focus for an element **and its descendants**
	// without accessing the underlying HTML.
	useEffect(() => {
		if (!containerRef || Platform.OS !== 'web') return;

		const element = containerRef as HTMLElement;
		if (inert) {
			element.setAttribute('inert', 'true');
		} else {
			element.removeAttribute('inert');
		}
	}, [containerRef, inert]);

	useEffect(() => {
		if ((refocusCounter ?? null) === null) return;
		if (!containerRef) return;

		const autoFocus = () => {
			if (Platform.OS === 'web') {
				// react-native-web defines UIManager.focus for setting the keyboard focus. However,
				// this property is not available in standard react-native. As such, access it using type
				// narrowing:
				// eslint-disable-next-line no-restricted-properties
				if (!('focus' in UIManager) || typeof UIManager.focus !== 'function') {
					throw new Error('Failed to focus sidebar. UIManager.focus is not a function.');
				}

				// Disable the "use focusHandler for all focus calls" rule -- UIManager.focus requires
				// an argument, which is not supported by focusHandler.
				// eslint-disable-next-line no-restricted-properties
				UIManager.focus(containerRef);
			} else {
				const handle = findNodeHandle(containerRef as View);
				if (handle !== null) {
					AccessibilityInfo.setAccessibilityFocus(handle);
				} else {
					logger.warn('Couldn\'t find a view to focus.');
				}
			}
		};

		focus('AccessibleView', {
			focus: autoFocus,
		});
	}, [containerRef, refocusCounter]);

	const canFocus = (refocusCounter ?? null) !== null;

	return <View
		importantForAccessibility={inert ? 'no-hide-descendants' : 'auto'}
		accessibilityElementsHidden={inert}
		aria-hidden={inert}
		pointerEvents={inert ? 'box-none' : 'auto'}

		// On some platforms, views must have accessible=true to be focused.
		accessible={canFocus ? true : undefined}

		ref={setContainerRef}
		{...viewProps}
	>
		{children}
	</View>;
};

export default AccessibleView;
