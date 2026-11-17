import * as React from 'react';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { consumeNoteOpenTransition, getZoomTransform, noteOpenTransitionDuration, TransitionOrigin } from '../utils/noteOpenTransition';

interface Props {
	children: React.ReactNode;
}

const styles = StyleSheet.create({
	container: { flex: 1 },
});

// Wraps the note screen. If the note was opened from a card of the notes grid, the screen
// zooms in from that card (and fades in). Otherwise, children are shown as usual.
const NoteOpenTransition: React.FC<Props> = props => {
	const { width, height } = useWindowDimensions();
	const progress = useRef(new Animated.Value(1)).current;
	// Read once, on mount. Must not be re-read on re-render.
	const originRef = useRef<TransitionOrigin|null|undefined>(undefined);
	if (originRef.current === undefined) originRef.current = consumeNoteOpenTransition();
	const origin = originRef.current;

	useEffect(() => {
		if (!origin) return () => {};
		let cancelled = false;
		let animation: Animated.CompositeAnimation|null = null;
		progress.setValue(0);
		void (async () => {
			// Respect the system "reduce animations" setting
			const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
			if (cancelled) return;
			if (reduceMotion) {
				progress.setValue(1);
				return;
			}
			animation = Animated.timing(progress, {
				toValue: 1,
				duration: noteOpenTransitionDuration,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			});
			animation.start();
		})();
		return () => {
			cancelled = true;
			animation?.stop();
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Intentionally run on mount only
	}, []);

	if (!origin) return <>{props.children}</>;

	const start = getZoomTransform(0, origin, width, height);
	const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [start.scale, 1] });
	const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [start.translateX, 0] });
	const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [start.translateY, 0] });

	return (
		<Animated.View style={[styles.container, { opacity: progress, transform: [{ translateX }, { translateY }, { scale }] }]}>
			{props.children}
		</Animated.View>
	);
};

export default NoteOpenTransition;
