import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let lastScreenReaderEnabled = false;
const useIsScreenReaderEnabled = () => {
	const [screenReaderEnabled, setIsScreenReaderEnabled] = useState(lastScreenReaderEnabled);
	useEffect(() => {
		AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
			lastScreenReaderEnabled = enabled;
			setIsScreenReaderEnabled(enabled);
		});
	}, []);

	useAsyncEffect(async () => {
		const enabled = await AccessibilityInfo.isScreenReaderEnabled();
		lastScreenReaderEnabled = enabled;
		setIsScreenReaderEnabled(enabled);
	}, []);

	return screenReaderEnabled;
};

export default useIsScreenReaderEnabled;
