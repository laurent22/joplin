import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const useReduceMotionEnabled = () => {
	const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
	useEffect(() => {
		AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
			setReduceMotionEnabled(enabled);
		});
	}, []);
	useAsyncEffect(async () => {
		setReduceMotionEnabled(await AccessibilityInfo.isReduceMotionEnabled());
	}, []);

	return reduceMotionEnabled;
};

export default useReduceMotionEnabled;
