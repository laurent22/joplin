//
// A button with a long-press action. Long-pressing the button displays a tooltip
//

import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useState, useMemo, useCallback, useRef } from 'react';
import { Text, Pressable, ViewStyle, StyleSheet, LayoutChangeEvent, LayoutRectangle, Animated, AccessibilityState, AccessibilityRole, TextStyle, GestureResponderEvent, Platform } from 'react-native';
import { Menu, MenuOptions, MenuTrigger, renderers } from 'react-native-popup-menu';
import Icon from './Icon';
import AccessibleView from './accessibility/AccessibleView';

type ButtonClickListener = ()=> void;
interface ButtonProps {
	onPress: ButtonClickListener;

	// Accessibility label and text shown in a tooltip
	description: string;

	iconName: string;
	iconStyle: TextStyle;

	themeId: number;

	// (web only) On web, touching buttons can cause the on-screen keyboard to be dismissed.
	// Setting preventKeyboardDismiss overrides this behavior.
	preventKeyboardDismiss?: boolean;

	containerStyle?: ViewStyle;
	contentWrapperStyle?: ViewStyle;

	// Additional accessibility information. See View.accessibilityHint
	accessibilityHint?: string;

	// Role of the button. Defaults to 'button'.
	accessibilityRole?: AccessibilityRole;
	accessibilityState?: AccessibilityState;

	disabled?: boolean;
}

const IconButton = (props: ButtonProps) => {
	const [tooltipVisible, setTooltipVisible] = useState(false);
	const [buttonLayout, setButtonLayout] = useState<LayoutRectangle|null>(null);
	const tooltipStyles = useTooltipStyles(props.themeId);

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

		setTooltipVisible(false);
	}, [fadeAnim]);
	const onLongPress = useCallback(() => {
		setTooltipVisible(true);
	}, []);

	const onButtonLayout = useCallback((event: LayoutChangeEvent) => {
		const layoutEvt = event.nativeEvent.layout;

		// Copy the layout event
		setButtonLayout({ ...layoutEvt });
	}, []);

	const { onTouchStart, onTouchMove, onTouchEnd } = usePreventKeyboardDismissTouchListeners(
		props.preventKeyboardDismiss, props.onPress, props.disabled,
	);

	const button = (
		<Pressable
			onPress={props.onPress}
			onLongPress={onLongPress}
			onPressIn={onPressIn}
			onPressOut={onPressOut}

			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}

			style={ props.containerStyle }

			disabled={ props.disabled ?? false }
			onLayout={ onButtonLayout }

			accessibilityLabel={props.description}
			accessibilityHint={props.accessibilityHint}
			accessibilityRole={props.accessibilityRole ?? 'button'}
			accessibilityState={props.accessibilityState}
		>
			<Animated.View style={{
				opacity: fadeAnim,
				...props.contentWrapperStyle,
			}}>
				<Icon
					name={props.iconName}
					style={props.iconStyle}
					accessibilityLabel={null}
				/>
			</Animated.View>
		</Pressable>
	);

	const renderTooltip = () => {
		if (!props.description) return null;

		return (
			<AccessibleView
				// Any information given by the tooltip should also be provided via
				// [accessibilityLabel]/[accessibilityHint]. As such, we can hide the tooltip
				// from the screen reader.
				inert={true}

				// Position the menu beneath the button so the tooltip appears in the
				// correct location.
				style={{
					left: buttonLayout?.x,
					top: buttonLayout?.y,
					position: 'absolute',
					zIndex: -1,
				}}
			>
				<Menu
					opened={tooltipVisible}
					renderer={renderers.Popover}
					rendererProps={{
						preferredPlacement: 'bottom',
						anchorStyle: tooltipStyles.anchor,
					}}>
					<MenuTrigger
						// Don't show/hide when pressed (let the Pressable handle opening/closing)
						disabled={true}
						style={{
							// Ensure that the trigger region has the same size as the button.
							width: buttonLayout?.width ?? 0,
							height: buttonLayout?.height ?? 0,
						}}
					/>
					<MenuOptions
						customStyles={{ optionsContainer: tooltipStyles.optionsContainer }}
					>
						<Text style={tooltipStyles.text}>
							{props.description}
						</Text>
					</MenuOptions>
				</Menu>
			</AccessibleView>
		);
	};

	return (
		<>
			{renderTooltip()}
			{button}
		</>
	);
};

const useTooltipStyles = (themeId: number) => {
	return useMemo(() => {
		const themeData: Theme = themeStyle(themeId);

		return StyleSheet.create({
			text: {
				color: themeData.raisedColor,
				padding: 4,
			},
			anchor: {
				backgroundColor: themeData.raisedBackgroundColor,
			},
			optionsContainer: {
				backgroundColor: themeData.raisedBackgroundColor,
			},
		});
	}, [themeId]);
};

// On web, by default, pressing buttons defocuses the active edit control, dismissing the
// virtual keyboard. This hook creates listeners that optionally prevent the keyboard from dismissing.
const usePreventKeyboardDismissTouchListeners = (preventKeyboardDismiss: boolean, onPress: ()=> void, disabled: boolean) => {
	const touchStartPointRef = useRef<[number, number]>();
	const isTapRef = useRef<boolean>();
	const onTouchStart = useCallback((event: GestureResponderEvent) => {
		if (Platform.OS === 'web' && preventKeyboardDismiss) {
			const touch = event.nativeEvent.touches[0];
			touchStartPointRef.current = [touch?.pageX, touch?.pageY];
			isTapRef.current = true;
		}
	}, [preventKeyboardDismiss]);

	const onTouchMove = useCallback((event: GestureResponderEvent) => {
		if (Platform.OS === 'web' && preventKeyboardDismiss && isTapRef.current) {
			// Update isTapRef onTouchMove, rather than onTouchEnd -- the final
			// touch position is unavailable in onTouchEnd on some devices.
			const touch = event.nativeEvent.touches[0];
			const dx = touch?.pageX - touchStartPointRef.current[0];
			const dy = touch?.pageY - touchStartPointRef.current[1];
			isTapRef.current = Math.hypot(dx, dy) < 15;
		}
	}, [preventKeyboardDismiss]);

	const onTouchEnd = useCallback((event: GestureResponderEvent) => {
		if (Platform.OS === 'web' && preventKeyboardDismiss) {
			if (isTapRef.current && !disabled) {
				event.preventDefault();
				onPress();
			}
		}
	}, [onPress, disabled, preventKeyboardDismiss]);

	return { onTouchStart, onTouchMove, onTouchEnd };
};

export default IconButton;
