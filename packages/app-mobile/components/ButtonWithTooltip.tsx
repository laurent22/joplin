//
// A button with a long-press action. Long-pressing the button displays a tooltip
//

const React = require('react');
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { Component, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ViewStyle, Animated } from 'react-native';

interface TooltipProps {
	theme: Theme;
	text: string;
	visible: boolean;
}

const Tooltip = (props: TooltipProps) => {
	const [tooltipY, setTooltipY] = useState(0);
	const [tooltipOnTop, setTooltipOnTop] = useState(true);
	const [tooltipRemoved, setTooltipRemoved] = useState(true);
	const tooltipRef = useRef<View>(null);
	const opacityAnimation = useRef(new Animated.Value(0)).current;

	// Fade in/out
	useEffect(() => {
		if (props.visible) {
			setTooltipRemoved(false);
		}

		Animated.timing(
			opacityAnimation,
			{
				toValue: props.visible ? 1.0 : 0.0,
				duration: 150,
				useNativeDriver: true,
			}
		).start(() => {
			setTooltipRemoved(!props.visible);
		});
	}, [opacityAnimation, props.visible]);

	const onTooltipLayout = useCallback(() => {
		tooltipRef.current?.measure((_x, y, _width, height, _pageX, pageY) => {
			if ((pageY - y) - height < 0) {
				setTooltipOnTop(false);
			}
			setTooltipY(-height);
		});
	}, []);

	const tooltipPosition: ViewStyle = {};
	if (tooltipOnTop) {
		tooltipPosition.top = tooltipY;
	} else {
		tooltipPosition.bottom = tooltipY;
	}

	if (tooltipRemoved) {
		return null;
	}

	return (
		<Animated.View
			onLayout={onTooltipLayout}
			ref={tooltipRef}
			style={{
				position: 'absolute',
				backgroundColor: props.theme.backgroundColor2,
				opacity: opacityAnimation,
				...tooltipPosition,
			}}
		>
			<Text style={{
				color: props.theme.color2,
				padding: 3,
				textAlign: 'center',
			}}>{props.text}</Text>
		</Animated.View>
	);
};

interface ButtonProps {
	onClick: ()=> void;
	description: string;
	children: Component[];
	themeId: number;

	// Additional accessibility information. See View.accessibilityHint
	accessibilityHint?: string;
	disabled?: boolean;

	style?: ViewStyle;
	contentStyle?: ViewStyle;
	pressedStyle?: ViewStyle;
}

const ButtonWithTooltip = (props: ButtonProps) => {
	const themeData = useMemo(() => themeStyle(props.themeId), [props.themeId]);
	const [tooltipVisible, setTooltipVisible] = useState(false);
	const [pressed, setPressed] = useState(false);

	const tooltip = (
		<Tooltip
			theme={themeData}
			text={props.description}
			visible={tooltipVisible}
		/>
	);

	const contentStyle = useMemo((): ViewStyle => {
		return {
			...props.contentStyle,
			...(pressed ? { opacity: 0.5 } : { }),
			...(pressed ? props.pressedStyle : { }),
		};
	}, [pressed, props.style, props.pressedStyle]);

	const onPressIn = useCallback(() => {
		setPressed(true);
	}, []);
	const onPressOut = useCallback(() => {
		setPressed(false);
		setTooltipVisible(false);
	}, []);
	const onLongPress = useCallback(() => {
		setTooltipVisible(true);
	}, []);

	const button = (
		<Pressable
			onPress={props.onClick}

			onPressIn={onPressIn}
			onLongPress={onLongPress}
			onPressOut={onPressOut}

			style={ props.style }

			disabled={ props.disabled ?? false }

			accessibilityLabel={props.description}
			accessibilityHint={props.accessibilityHint}
			accessibilityRole={'button'}
		>
			<View style={contentStyle}>
				{ props.children }
			</View>
			{ tooltip }
		</Pressable>
	);

	return button;
};

export default ButtonWithTooltip;
