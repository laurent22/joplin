//
// A button with a long-press action. Long-pressing the button displays a tooltip
//

const React = require('react');
import { ReactNode } from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable, ViewStyle, PressableStateCallbackType, StyleProp, StyleSheet, LayoutChangeEvent, LayoutRectangle, Animated, AccessibilityState, AccessibilityRole } from 'react-native';
import { Menu, MenuOptions, MenuTrigger, renderers } from 'react-native-popup-menu';

type ButtonClickListener = ()=> void;
interface ButtonProps {
	onPress: ButtonClickListener;

	// Accessibility label and text shown in a tooltip
	description?: string;

	children: ReactNode;

	themeId: number;

	style?: ViewStyle;
	pressedStyle?: ViewStyle;
	contentStyle?: ViewStyle;

	// Additional accessibility information. See View.accessibilityHint
	accessibilityHint?: string;

	// Role of the button. Defaults to 'button'.
	accessibilityRole?: AccessibilityRole;
	accessibilityState?: AccessibilityState;

	disabled?: boolean;
}

const CustomButton = (props: ButtonProps) => {
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

	// Select different user-specified styles if selected/unselected.
	const onStyleChange = useCallback((state: PressableStateCallbackType): StyleProp<ViewStyle> => {
		let result = { ...props.style };

		if (state.pressed) {
			result = {
				...result,
				...props.pressedStyle,
			};
		}
		return result;
	}, [props.pressedStyle, props.style]);

	const onButtonLayout = useCallback((event: LayoutChangeEvent) => {
		const layoutEvt = event.nativeEvent.layout;

		// Copy the layout event
		setButtonLayout({ ...layoutEvt });
	}, []);


	const button = (
		<Pressable
			onPress={props.onPress}
			onLongPress={onLongPress}
			onPressIn={onPressIn}
			onPressOut={onPressOut}

			style={ onStyleChange }

			disabled={ props.disabled ?? false }
			onLayout={ onButtonLayout }

			accessibilityLabel={props.description}
			accessibilityHint={props.accessibilityHint}
			accessibilityRole={props.accessibilityRole ?? 'button'}
			accessibilityState={props.accessibilityState}
		>
			<Animated.View style={{
				opacity: fadeAnim,
				...props.contentStyle,
			}}>
				{ props.children }
			</Animated.View>
		</Pressable>
	);

	const tooltip = (
		<View
			// Any information given by the tooltip should also be provided via
			// [accessibilityLabel]/[accessibilityHint]. As such, we can hide the tooltip
			// from the screen reader.
			// On Android:
			importantForAccessibility='no-hide-descendants'
			// On iOS:
			accessibilityElementsHidden={true}

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
		</View>
	);

	return (
		<>
			{props.description ? tooltip : null}
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

export default CustomButton;
