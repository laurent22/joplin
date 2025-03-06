import * as React from 'react';
import { connect } from 'react-redux';
import { AccessibilityInfo, Animated, Dimensions, Easing, I18nManager, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { State } from '@joplin/lib/reducer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccessibleView from './accessibility/AccessibleView';
import { _ } from '@joplin/lib/locale';
import useReduceMotionEnabled from '../utils/hooks/useReduceMotionEnabled';
import { themeStyle } from './global-style';

export enum SideMenuPosition {
	Left = 'left',
	Right = 'right',
}

export type OnChangeCallback = (isOpen: boolean)=> void;

interface Props {
	themeId: number;
	isOpen: boolean;

	menu: React.ReactNode;
	children: React.ReactNode|React.ReactNode[];
	edgeHitWidth: number;
	toleranceX: number;
	toleranceY: number;
	openMenuOffset: number;
	menuPosition: SideMenuPosition;

	onChange: OnChangeCallback;
	disableGestures: boolean;
}

interface UseStylesProps {
	themeId: number;
	isLeftMenu: boolean;
	menuWidth: number;
	menuOpenFraction: Animated.AnimatedInterpolation<number>;
}

const useStyles = ({ themeId, isLeftMenu, menuWidth, menuOpenFraction }: UseStylesProps) => {
	const { height: windowHeight, width: windowWidth } = useWindowDimensions();
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			mainContainer: {
				display: 'flex',
				alignContent: 'stretch',
				height: windowHeight,
				flexGrow: 1,
				flexShrink: 1,
			},
			contentOuterWrapper: {
				flexGrow: 1,
				flexShrink: 1,
				width: windowWidth,
				height: windowHeight,
				transform: [{
					translateX: menuOpenFraction.interpolate({
						inputRange: [0, 1],
						outputRange: [0, isLeftMenu ? menuWidth : -menuWidth],
					}),
					// The RN Animation docs suggests setting "perspective" while setting other transform styles:
					// https://reactnative.dev/docs/animations#bear-in-mind
				}, { perspective: 1000 }],
			},
			contentWrapper: {
				display: 'flex',
				flexDirection: 'column',
				flexGrow: 1,
				flexShrink: 1,
			},
			menuWrapper: {
				position: 'absolute',
				top: 0,
				bottom: 0,
				width: menuWidth,

				// In React Native, RTL replaces `left` with `right` and `right` with `left`.
				// As such, we need to reverse the normal direction in RTL mode.
				...(isLeftMenu === !I18nManager.isRTL ? {
					left: 0,
				} : {
					right: 0,
				}),
			},
			closeButtonOverlay: {
				position: 'absolute',
				left: 0,
				right: 0,
				top: 0,
				bottom: 0,

				zIndex: 1,

				opacity: menuOpenFraction.interpolate({
					inputRange: [0, 1],
					outputRange: [0, 0.1],
					extrapolate: 'clamp',
				}),
				backgroundColor: theme.colorFaded,
				display: 'flex',
				alignContent: 'stretch',
			},
			overlayContent: {
				height: windowHeight,
				width: windowWidth,
			},
		});
	}, [themeId, isLeftMenu, windowWidth, windowHeight, menuWidth, menuOpenFraction]);
};

interface UseAnimationsProps {
	menuWidth: number;
	isLeftMenu: boolean;
	open: boolean;
}

const useAnimations = ({ menuWidth, isLeftMenu, open }: UseAnimationsProps) => {
	const [animating, setIsAnimating] = useState(false);
	const menuDragOffset = useMemo(() => new Animated.Value(0), []);
	const basePositioningFraction = useMemo(() => new Animated.Value(0), []);
	const maximumDragOffsetValue = useMemo(() => new Animated.Value(1), []);

	// Update the value in a useEffect to prevent delays in applying the animation caused by
	// re-renders.
	useEffect(() => {
		// In a right-side menu, the drag offset increases while the menu is closing.
		// It needs to be inverted in that case:
		// || 1: Prevents division by zero
		maximumDragOffsetValue.setValue((menuWidth || 1) * (isLeftMenu ? 1 : -1));
	}, [menuWidth, isLeftMenu, maximumDragOffsetValue]);

	const menuOpenFraction = useMemo(() => {
		const animatedDragFraction = Animated.divide(menuDragOffset, maximumDragOffsetValue);

		return Animated.add(basePositioningFraction, animatedDragFraction);
	}, [menuDragOffset, basePositioningFraction, maximumDragOffsetValue]);

	const reduceMotionEnabled = useReduceMotionEnabled();
	const reduceMotionEnabledRef = useRef(false);
	reduceMotionEnabledRef.current = reduceMotionEnabled;

	const updateMenuPosition = useCallback(() => {
		const baseAnimationProps = {
			easing: Easing.elastic(0.5),
			duration: reduceMotionEnabledRef.current ? 0 : 200,
			useNativeDriver: true,
		};
		setIsAnimating(true);

		const animation = Animated.parallel([
			Animated.timing(basePositioningFraction, { toValue: open ? 1 : 0, ...baseAnimationProps }),
			Animated.timing(menuDragOffset, { toValue: 0, ...baseAnimationProps }),
		]);
		animation.start((result) => {
			if (result.finished) {
				setIsAnimating(false);
			}
		});
	}, [open, menuDragOffset, basePositioningFraction]);
	useEffect(() => {
		updateMenuPosition();
	}, [updateMenuPosition]);

	return { setIsAnimating, animating, updateMenuPosition, menuOpenFraction, menuDragOffset };
};

const SideMenuComponent: React.FC<Props> = props => {
	const [open, setIsOpen] = useState(false);

	useEffect(() => {
		setIsOpen(props.isOpen);
	}, [props.isOpen]);

	const [menuWidth, setMenuWidth] = useState(0);
	const [contentWidth, setContentWidth] = useState(0);

	// In right-to-left layout, swap left and right to be consistent with other parts of
	// the app's layout.
	const isLeftMenu = props.menuPosition === (I18nManager.isRTL ? SideMenuPosition.Right : SideMenuPosition.Left);

	const onLayoutChange = useCallback((e: LayoutChangeEvent) => {
		const { width } = e.nativeEvent.layout;
		const openMenuOffsetPercentage = props.openMenuOffset / Dimensions.get('window').width;
		const menuWidth = Math.floor(width * openMenuOffsetPercentage);

		setContentWidth(width);
		setMenuWidth(menuWidth);
	}, [props.openMenuOffset]);

	const { animating, setIsAnimating, menuDragOffset, updateMenuPosition, menuOpenFraction } = useAnimations({
		isLeftMenu, menuWidth, open,
	});

	const panResponder = useMemo(() => {
		return PanResponder.create({
			onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
				if (props.disableGestures) {
					return false;
				}

				let startX;
				let dx;
				const dy = gestureState.dy;

				// Untransformed start position of the gesture -- moveX is the current position of
				// the pointer. Subtracting dx gives us the original start position.
				const gestureStartScreenX = gestureState.moveX - gestureState.dx;

				// Transform x, dx such that they are relative to the target screen edge -- this simplifies later
				// math.
				if (isLeftMenu) {
					startX = gestureStartScreenX;
					dx = gestureState.dx;
				} else {
					startX = contentWidth - gestureStartScreenX;
					dx = -gestureState.dx;
				}

				const motionWithinToleranceY = Math.abs(dy) <= props.toleranceY;
				let startWithinTolerance, motionWithinToleranceX;
				if (open) {
					startWithinTolerance = startX >= menuWidth - props.edgeHitWidth;
					motionWithinToleranceX = dx <= -props.toleranceX;
				} else {
					startWithinTolerance = startX <= props.edgeHitWidth;
					motionWithinToleranceX = dx >= props.toleranceX;
				}

				return startWithinTolerance && motionWithinToleranceX && motionWithinToleranceY;
			},
			onPanResponderGrant: () => {
				setIsAnimating(true);
			},
			onPanResponderMove: Animated.event([
				null,
				// Updates menuDragOffset with the .dx property of the second argument:
				{ dx: menuDragOffset },
			], { useNativeDriver: false }),
			onPanResponderEnd: (_event, gestureState) => {
				const newOpen = (gestureState.dx > 0) === isLeftMenu;
				if (newOpen === open) {
					updateMenuPosition();
				} else {
					setIsOpen(newOpen);
				}
			},
		});
	}, [isLeftMenu, menuDragOffset, menuWidth, props.toleranceX, props.toleranceY, contentWidth, open, props.disableGestures, props.edgeHitWidth, updateMenuPosition, setIsAnimating]);

	const onChangeRef = useRef(props.onChange);
	onChangeRef.current = props.onChange;
	useEffect(() => {
		onChangeRef.current(open);

		AccessibilityInfo.announceForAccessibility(
			open ? _('Side menu opened') : _('Side menu closed'),
		);
	}, [open]);

	const onCloseButtonPress = useCallback(() => {
		setIsOpen(false);
		// Set isAnimating as soon as possible to avoid components disappearing, then reappearing.
		setIsAnimating(true);
	}, [setIsAnimating]);

	const styles = useStyles({ themeId: props.themeId, menuOpenFraction, menuWidth, isLeftMenu });

	const menuComponent = (
		<AccessibleView
			inert={!open}
			style={styles.menuWrapper}
		>
			<AccessibleView
				// Auto-focuses an empty view at the beginning of the sidemenu -- if we instead
				// focus the container view, VoiceOver fails to focus to any components within
				// the sidebar.
				refocusCounter={!open ? 1 : undefined}
			/>

			{props.menu}
		</AccessibleView>
	);

	const contentComponent = (
		<AccessibleView
			inert={open}
			style={styles.contentWrapper}
		>
			<AccessibleView refocusCounter={open ? 1 : undefined} />
			{props.children}
		</AccessibleView>
	);
	const closeButtonOverlay = (open || animating) ? (
		<Animated.View
			style={styles.closeButtonOverlay}
		>
			<Pressable
				aria-label={_('Close side menu')}
				role='button'
				onPress={onCloseButtonPress}
				style={styles.overlayContent}
			></Pressable>
		</Animated.View>
	) : null;

	return (
		<View
			onLayout={onLayoutChange}
			style={styles.mainContainer}
			{...panResponder.panHandlers}
		>
			{menuComponent}
			<Animated.View style={styles.contentOuterWrapper}>
				{contentComponent}
				{closeButtonOverlay}
			</Animated.View>
		</View>
	);
};

const SideMenu = connect((state: State) => {
	return {
		themeId: state.settings.theme,
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

export default SideMenu;
