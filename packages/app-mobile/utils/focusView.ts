import { focus } from '@joplin/lib/utils/focusHandler';
import Logger from '@joplin/utils/Logger';
import { AccessibilityInfo, findNodeHandle, Platform, UIManager, View } from 'react-native';

const logger = Logger.create('focusView');

const focusView = (source: string, view: View|HTMLElement) => {
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
			UIManager.focus(view);
		} else {
			const handle = findNodeHandle(view as View);
			if (handle !== null) {
				AccessibilityInfo.setAccessibilityFocus(handle);
			} else {
				logger.warn('Couldn\'t find a view to focus.');
			}
		}
	};

	focus(`focusView:${source}`, {
		focus: autoFocus,
	});
};

export default focusView;
