import * as React from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Platform, View, ViewProps } from 'react-native';
import { AutoFocusContext } from './FocusControl/AutoFocusProvider';
import Logger from '@joplin/utils/Logger';
import focusView from '../../utils/focusView';

const logger = Logger.create('AccessibleView');

interface Props extends ViewProps {
	// Prevents a view from being interacted with by accessibility tools, the mouse, or the keyboard focus.
	// See https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert.
	inert?: boolean;

	// When refocusCounter changes, sets the accessibility focus to this view.
	// May require accessible={true}.
	refocusCounter?: number;
}

const useAutoFocus = (refocusCounter: number|null, containerNode: View|HTMLElement|null, debugLabel: string) => {
	const autoFocusControl = useContext(AutoFocusContext);
	const autoFocusControlRef = useRef(autoFocusControl);
	autoFocusControlRef.current = autoFocusControl;
	const debugLabelRef = useRef(debugLabel);
	debugLabelRef.current = debugLabel;

	useEffect(() => {
		if ((refocusCounter ?? null) === null) return () => {};
		if (!containerNode) return () => {};

		const focusContainer = () => {
			focusView(`AccessibleView::${debugLabelRef.current}`, containerNode);
		};

		const canFocusNow = !autoFocusControlRef.current || autoFocusControlRef.current.canAutoFocus();
		if (canFocusNow) {
			focusContainer();
			return () => {};
		} else { // Delay autofocus
			logger.debug(`Delaying autofocus for ${debugLabelRef.current}`);
			// Allows the view to be refocused when, for example, a dialog is dismissed
			autoFocusControlRef.current?.setAutofocusCallback(focusContainer);
			return () => {
				autoFocusControlRef.current?.removeAutofocusCallback(focusContainer);
			};
		}
	}, [containerNode, refocusCounter]);
};

const AccessibleView: React.FC<Props> = ({ inert, refocusCounter, children, ...viewProps }) => {
	const [containerRef, setContainerRef] = useState<View|HTMLElement|null>(null);

	const debugLabel = viewProps.testID ?? 'AccessibleView';
	useAutoFocus(refocusCounter, containerRef, debugLabel);

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
