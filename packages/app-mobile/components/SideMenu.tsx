import * as React from 'react';
import { connect } from 'react-redux';
import { Animated, Dimensions, Easing, I18nManager, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { State } from '@joplin/lib/reducer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccessibleView from './accessibility/AccessibleView';
import { _ } from '@joplin/lib/locale';
import useReduceMotionEnabled from '../utils/hooks/useReduceMotionEnabled';

export enum SideMenuPosition {
	Left = 'left',
	Right = 'right',
}

interface Props {
	isOpen: boolean;

	menu: React.ReactNode;
	children: React.ReactNode|React.ReactNode[];
	edgeHitWidth: number;
	toleranceX: number;
	toleranceY: number;
	openMenuOffset: number;
	menuPosition: SideMenuPosition;

	onChange: (isOpen: boolean)=> void;
	disableGestures: boolean;
}

interface UseStylesProps {
	isLeftMenu: boolean;
	openMenuOffset: number;
	menuOpenFraction: Animated.AnimatedInterpolation<number>;
}

const useStyles = ({ isLeftMenu, openMenuOffset, menuOpenFraction }: UseStylesProps) => {
	const { height: windowHeight, width: windowWidth } = useWindowDimensions();
	return useMemo(() => {
		return StyleSheet.create({
			mainContainer: {
				display: 'flex',
				alignContent: 'stretch',
				height: windowHeight,
			},
			contentOuterWrapper: {
				width: windowWidth,
				height: windowHeight,
				transform: [{
					translateX: menuOpenFraction.interpolate({
						inputRange: [0, 1],
						outputRange: [0, isLeftMenu ? openMenuOffset : -openMenuOffset],
						extrapolate: 'clamp',
					}),
				}],
			},
			contentWrapper: {
				display: 'flex',
				flexDirection: 'column',
				flexGrow: 1,
			},
			menuWrapper: {
				position: 'absolute',
				height: windowHeight,
				width: openMenuOffset,

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
				width: windowWidth,
				height: windowHeight,

				backgroundColor: 'rgba(0, 0, 0, 0.1)',
				display: 'flex',
				alignContent: 'stretch',
			},
			overlayContent: {
				height: windowHeight,
				width: windowWidth,
			},
		});
	}, [isLeftMenu, windowWidth, windowHeight, openMenuOffset, menuOpenFraction]);
};

interface UseAnimationsProps {
	openMenuOffset: number;
	isLeftMenu: boolean;
	open: boolean;
}

const useAnimations = ({ openMenuOffset, isLeftMenu, open }: UseAnimationsProps) => {
	const [animating, setIsAnimating] = useState(false);
	const menuDragOffset = useMemo(() => new Animated.Value(0), []);
	const basePositioningFraction = useMemo(() => new Animated.Value(0), []);

	const menuOpenFraction = useMemo(() => {
		// || 1: Prevents divide by zero
		const animatedDragFraction = Animated.divide(
			menuDragOffset,
			// In a right-side menu, the drag offset increases while the menu is closing.
			// It needs to be inverted in that case:
			(openMenuOffset || 1) * (isLeftMenu ? 1 : -1),
		);

		return Animated.add(basePositioningFraction, animatedDragFraction);
	}, [menuDragOffset, basePositioningFraction, openMenuOffset, isLeftMenu]);

	const reduceMotionEnabled = useReduceMotionEnabled();
	const reduceMotionEnabledRef = useRef(false);
	reduceMotionEnabledRef.current = reduceMotionEnabled;

	const updateMenuPosition = useCallback(() => {
		const baseAnimationProps = {
			easing: Easing.ease,
			duration: reduceMotionEnabledRef.current ? 0 : 300,
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
	const [openMenuOffset, setOpenMenuOffset] = useState(0);
	const [size, setSize] = useState({ width: 0, height: 0 });

	// In right-to-left layout, swap left and right to be consistent with other parts of
	// the app's layout.
	const isLeftMenu = props.menuPosition === (I18nManager.isRTL ? SideMenuPosition.Right : SideMenuPosition.Left);

	const onLayoutChange = useCallback((e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		const openMenuOffsetPercentage = props.openMenuOffset / Dimensions.get('window').width;
		const openMenuOffset = width * openMenuOffsetPercentage;

		setSize({ width, height });
		setOpenMenuOffset(openMenuOffset);
	}, [props.openMenuOffset]);
	const [open, setIsOpen] = useState(false);

	const { animating, setIsAnimating, menuDragOffset, updateMenuPosition, menuOpenFraction } = useAnimations({
		isLeftMenu, openMenuOffset, open,
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
					startX = size.width - gestureStartScreenX;
					dx = -gestureState.dx;
				}

				const motionWithinToleranceY = Math.abs(dy) <= props.toleranceY;
				let startWithinTolerance, motionWithinToleranceX;
				if (open) {
					startWithinTolerance = startX >= openMenuOffset - props.edgeHitWidth;
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
			onPanResponderMove: Animated.event([null, { dx: menuDragOffset }], { useNativeDriver: false }),
			onPanResponderEnd: (_event, gestureState) => {
				const newOpen = (gestureState.dx > 0) === isLeftMenu;
				if (newOpen === open) {
					updateMenuPosition();
				} else {
					setIsOpen(newOpen);
				}
			},
		});
	}, [isLeftMenu, menuDragOffset, openMenuOffset, props.toleranceX, props.toleranceY, size, open, props.disableGestures, props.edgeHitWidth, updateMenuPosition, setIsAnimating]);

	useEffect(() => {
		setIsOpen(props.isOpen);
	}, [props.isOpen]);

	const onChangeRef = useRef(props.onChange);
	onChangeRef.current = props.onChange;
	useEffect(() => {
		onChangeRef.current(open);
	}, [open]);

	const onCloseButtonPress = useCallback(() => {
		setIsOpen(false);
		setIsAnimating(true);
	}, [setIsAnimating]);

	const styles = useStyles({ menuOpenFraction, openMenuOffset: openMenuOffset, isLeftMenu });

	const menuComponent = (
		<AccessibleView
			inert={!open}
			style={styles.menuWrapper}
		>
			{props.menu}
		</AccessibleView>
	);

	const contentComponent = (
		<AccessibleView
			inert={open}
			style={styles.contentWrapper}
		>
			{props.children}
		</AccessibleView>
	);
	const closeButtonOverlay = (open || animating) ? (
		<Animated.View
			style={[styles.closeButtonOverlay, { opacity: menuOpenFraction }]}
		>
			<Pressable
				aria-label={_('Close sidemenu')}
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
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

export default SideMenu;
