import * as React from 'react';
import { connect } from 'react-redux';
import { Animated, Dimensions, Easing, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { State } from '@joplin/lib/reducer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccessibleView from './accessibility/AccessibleView';
import { _ } from '@joplin/lib/locale';

export enum SideMenuPosition {
	Left = 'left',
	Right = 'right',
}

// Built to have an API roughly compatible with
// https://www.npmjs.com/package/react-native-side-menu-updated
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
	onSliding?: (percent: number)=> void;
}

const useStyles = () => {
	const { height: windowHeight, width: windowWidth } = useWindowDimensions();
	return useMemo(() => {
		return StyleSheet.create({
			outerWrapper: {
				display: 'flex',
				alignContent: 'stretch',
				height: windowHeight,
			},
			contentWrapper: {
				display: 'flex',
				flexDirection: 'column',
				height: windowHeight,
			},
			menuWrapper: {
				position: 'absolute',
				height: windowHeight,
			},
			overlay: {
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
	}, [windowWidth, windowHeight]);
};

const SideMenuComponent: React.FC<Props> = props => {
	const [openMenuOffset, setOpenMenuOffset] = useState(0);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const onLayoutChange = useCallback((e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		const openMenuOffsetPercentage = props.openMenuOffset / Dimensions.get('window').width;
		const openMenuOffset = width * openMenuOffsetPercentage;

		setSize({ width, height });
		setOpenMenuOffset(openMenuOffset);
	}, [props.openMenuOffset]);
	const isLeftMenu = props.menuPosition === SideMenuPosition.Left;
	const [open, setIsOpen] = useState(false);
	const [animating, setIsAnimating] = useState(false);
	const menuDragOffsetAnim = useMemo(() => new Animated.Value(0), []);
	const menuPositionAnim = useMemo(() => new Animated.Value(0), []);
	const composedMenuOffsetAnim = useMemo(() => {
		return Animated.add(menuPositionAnim, menuDragOffsetAnim);
	}, [menuPositionAnim, menuDragOffsetAnim]);

	const onSlidingRef = useRef(props.onSliding);
	onSlidingRef.current = props.onSliding;
	const menuOpenFraction = useMemo(() => {
		const result = Animated.divide(composedMenuOffsetAnim, (isLeftMenu ? openMenuOffset : -openMenuOffset) || 1);
		result.addListener(({ value }: { value: number }) => {
			if (0 >= value && value <= 1) {
				onSlidingRef.current?.(value * 100);
			}
		});
		return result;
	}, [composedMenuOffsetAnim, openMenuOffset, isLeftMenu]);

	const updateMenuPosition = useCallback(() => {
		const targetOpenValue = isLeftMenu ? openMenuOffset : -openMenuOffset;
		const baseAnimationProps = {
			easing: Easing.ease,
			duration: 200,
			useNativeDriver: true,
		};
		setIsAnimating(true);
		Animated.parallel([
			Animated.timing(menuPositionAnim, { toValue: open ? targetOpenValue : 0, ...baseAnimationProps }),
			Animated.timing(menuDragOffsetAnim, { toValue: 0, ...baseAnimationProps }),
		]).start(() => {
			setIsAnimating(false);
		});
	}, [open, isLeftMenu, openMenuOffset, menuDragOffsetAnim, menuPositionAnim]);
	useEffect(() => {
		updateMenuPosition();
	}, [updateMenuPosition]);

	const panResponder = useMemo(() => {
		return PanResponder.create({
			onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
				if (props.disableGestures) {
					return false;
				}

				// Transform x, y, dx, dy such that they are relative to the target screen edge.
				let startX;
				let dx;
				const relDy = gestureState.dy;

				if (isLeftMenu) {
					startX = gestureState.moveX - gestureState.dx;
					dx = gestureState.dx;
				} else {
					startX = size.width - (gestureState.moveX - gestureState.dx);
					dx = -gestureState.dx;
				}

				const motionWithinToleranceY = Math.abs(relDy) <= props.toleranceY;
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
			onPanResponderMove: Animated.event([null, { dx: menuDragOffsetAnim }], { useNativeDriver: false }),
			onPanResponderEnd: (_event, gestureState) => {
				const newOpen = (gestureState.dx > 0) === isLeftMenu;
				if (newOpen === open) {
					updateMenuPosition();
				} else {
					setIsOpen(newOpen);
				}
			},
		});
	}, [isLeftMenu, menuDragOffsetAnim, openMenuOffset, props.toleranceX, props.toleranceY, size, open, props.disableGestures, props.edgeHitWidth, updateMenuPosition]);

	useEffect(() => {
		setIsOpen(props.isOpen);
	}, [props.isOpen]);

	const onChangeRef = useRef(props.onChange);
	onChangeRef.current = props.onChange;
	useEffect(() => {
		onChangeRef.current(open);
	}, [open]);


	const styles = useStyles();

	const overlayOffset = useMemo(() => {
		if (isLeftMenu) {
			return { left: -openMenuOffset, width: openMenuOffset };
		} else {
			return { right: -openMenuOffset, width: openMenuOffset };
		}
	}, [openMenuOffset, isLeftMenu]);
	const wrappedMenu = (
		<AccessibleView
			inert={!open}
			refocusCounter={open ? 1 : undefined}
			style={[styles.menuWrapper, overlayOffset]}
		>
			{props.menu}
		</AccessibleView>
	);

	const wrappedContent = (
		<AccessibleView
			inert={open}
			style={styles.contentWrapper}
		>
			{props.children}
		</AccessibleView>
	);
	const contentOverlay = (open || animating) ? (
		<Animated.View
			style={[styles.overlay, { opacity: menuOpenFraction }]}
		>
			<Pressable
				aria-label={_('Close sidemenu')}
				onPress={() => setIsOpen(false)}
				style={styles.overlayContent}
			></Pressable>
		</Animated.View>
	) : null;

	return (
		<View
			onLayout={onLayoutChange}
			style={styles.outerWrapper}
		>
			<Animated.View style={{
				transform: [{ translateX: composedMenuOffsetAnim }],
			}} {...panResponder.panHandlers}>
				{wrappedMenu}
				{wrappedContent}
				{contentOverlay}
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
