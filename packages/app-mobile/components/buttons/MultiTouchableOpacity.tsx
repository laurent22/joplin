import * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Pressable, ViewProps, PressableProps } from 'react-native';

interface Props extends PressableProps {
	// Nodes that need to change opacity but shouldn't be included in the main touchable
	beforePressable: React.ReactNode;
	// Children of the main pressable
	children: React.ReactNode;
	onPress: ()=> void;

	containerProps?: ViewProps;
}

// A TouchableOpacity that can contain multiple pressable items still within the region that
// changes opacity
const MultiTouchableOpacity: React.FC<Props> = ({ beforePressable, children, onPress, containerProps = {}, ...pressableProps }) => {
	// See https://blog.logrocket.com/react-native-touchable-vs-pressable-components/
	// for more about animating Pressable buttons.
	const fadeAnim = useRef(new Animated.Value(1)).current;

	const animationDuration = 100; // ms
	const onPressIn = useCallback(() => {
		// Fade out.
		Animated.timing(fadeAnim, {
			toValue: 0.5,
			duration: animationDuration,
			useNativeDriver: true,
		}).start();
	}, [fadeAnim]);
	const onPressOut = useCallback(() => {
		// Fade in.
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: animationDuration,
			useNativeDriver: true,
		}).start();
	}, [fadeAnim]);

	const button = (
		<Pressable
			accessibilityRole='button'
			{...pressableProps}
			onPress={onPress}
			onPressIn={onPressIn}
			onPressOut={onPressOut}
		>
			{children}
		</Pressable>
	);

	const styles = useMemo(() => {
		return StyleSheet.create({
			container: { opacity: fadeAnim },
		});
	}, [fadeAnim]);

	return (
		<Animated.View {...containerProps} style={[styles.container, containerProps.style]}>
			{beforePressable}
			{button}
		</Animated.View>
	);
};

export default MultiTouchableOpacity;
