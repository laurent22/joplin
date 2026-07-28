import * as React from 'react';
import { connect } from 'react-redux';
import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, GestureResponderEvent, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, PanResponder, PanResponderGestureState, Platform, Pressable, ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';
import { themeStyle, ThemeStyle } from './global-style';
import Modal from './Modal';
import { AppState } from '../utils/types';
import useReduceMotionEnabled from '../utils/hooks/useReduceMotionEnabled';
import { _ } from '@joplin/lib/locale';

export enum MenuAlignment {
	Center,
	Right,
}

export enum MenuType {
	Docked,
	Floating,
}

interface Props {
	themeId: number;
	menuType?: MenuType;
	style?: StyleProp<ViewStyle>;
	contentStyle?: StyleProp<ViewStyle>;
	alignment?: MenuAlignment;
	children: React.ReactNode;
	visible: boolean;
	draggable: boolean;
	autoScrollToEnd?: boolean;
	onDismiss: ()=> void;
	onShow?: ()=> void;
}

interface UseStylesProps {
	alignment: MenuAlignment;
	menuType: MenuType;
	theme: ThemeStyle;
	dragging: boolean;
	draggable: boolean;
	backgroundOpacity: Animated.AnimatedInterpolation<number>;
	dragOffset: Animated.AnimatedInterpolation<number>;
}

const useStyles = ({ theme, menuType, dragging, alignment, draggable, dragOffset, backgroundOpacity }: UseStylesProps) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const safeAreaPadding = useSafeAreaPadding();

	const menuMarginTop = theme.margin + safeAreaPadding.paddingTop;
	const showDragHandle = draggable && menuType === MenuType.Docked;

	return useMemo(() => {
		const isSmallWidthScreen = windowWidth < 500;
		const menuGapLeft = safeAreaPadding.paddingLeft + 6;
		const menuGapRight = safeAreaPadding.paddingRight + 6;

		// On web, any spaceBelowScreenEdge results in a scrollbar and extra scroll.
		const spaceBelowScreenEdge = Platform.OS === 'web' ? 0 : windowHeight;

		return StyleSheet.create({
			backgroundStyle: {
				backgroundColor: theme.backgroundColorTransparent2,
				opacity: backgroundOpacity.interpolate({
					inputRange: [0, 1],
					outputRange: [0, 1],
					extrapolate: 'clamp',
				}),
				position: 'absolute',
				left: 0,
				right: 0,
				// Add additional space to prevent the edge of the background from being visible
				// during overscroll on iOS
				top: -spaceBelowScreenEdge,
				bottom: -spaceBelowScreenEdge,

				zIndex: 0,
			},
			menuStyle: {
				zIndex: 1,
				alignSelf: alignment === MenuAlignment.Center ? 'center' : 'flex-end',
				...(isSmallWidthScreen ? {
					// Center on small screens, rather than float right.
					alignSelf: 'center',
				} : {}),
				flexDirection: 'row',
				marginRight: menuGapRight,
				marginLeft: menuGapLeft,

				backgroundColor: theme.backgroundColor,
				borderRadius: 16,
				...(menuType === MenuType.Docked ? {
					borderBottomRightRadius: 0,
					borderBottomLeftRadius: 0,
					marginBottom: safeAreaPadding.paddingBottom - spaceBelowScreenEdge,
				} : {
					marginBottom: safeAreaPadding.paddingBottom,
				}),
				maxWidth: Math.min(
					menuType === MenuType.Floating ? 250 : 400,
					windowWidth - menuGapRight - menuGapLeft,
				),

				shadowRadius: 4,
				shadowColor: theme.color,
				shadowOpacity: 0.15,


				userSelect: dragging ? 'none' : 'auto',
				transform: [
					{
						translateY: dragOffset.interpolate({
							inputRange: [-spaceBelowScreenEdge, 1],
							outputRange: [-spaceBelowScreenEdge, 1],
							// Avoid shifting the menu up when there's no extra space below the menu
							extrapolateLeft: 'clamp',
							extrapolateRight: 'extend',
						}),
					},
					{ perspective: 1000 },
				],
			},
			contentContainer: {
				flexDirection: 'row',
				flexWrap: 'wrap',
				flexShrink: 1,
				flexGrow: 1,

				padding: 20,

				...(menuType === MenuType.Docked ? {
					paddingBottom: 14 + safeAreaPadding.paddingBottom,
					// The drag handle should be at the very top of the menu
					paddingTop: showDragHandle ? 0 : undefined,
					marginBottom: spaceBelowScreenEdge,
				} : {
					paddingTop: theme.marginSmall,
					paddingBottom: theme.marginSmall,
				}),
			},
			modalBackground: {
				paddingLeft: 0,
				paddingRight: 0,
				paddingBottom: 0,
				paddingTop: menuMarginTop,
				justifyContent: 'flex-end',
				flexDirection: 'column',
			},
			dismissButton: {
				top: 0,
				bottom: undefined,
				height: theme.marginMedium,
			},

			dragHandleContainer: {
				display: showDragHandle ? 'flex' : 'none',
				width: '100%',
				height: theme.margin,
				cursor: 'auto',
			},
			dragHandle: {
				marginLeft: 'auto',
				marginRight: 'auto',
				backgroundColor: theme.dividerColor,
				width: '100%',

				marginVertical: theme.marginSmall,

				maxWidth: 88,
				height: 5,
				borderRadius: theme.borderRadius,
			},

			// An invisible overlay, prevents drags from clicking buttons on web
			dragOverlay: {
				position: 'absolute',
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 2,
			},
		});
	}, [theme, menuType, safeAreaPadding, showDragHandle, windowWidth, dragging, alignment, dragOffset, windowHeight, backgroundOpacity, menuMarginTop]);
};

interface UsePanResponderProps {
	visible: boolean;
	animating: boolean;
	setDragging: (dragging: boolean)=> void;
	onDragEnd: (dx: number, dy: number)=> void;
	dragValue: Animated.Value;
	dragHandleRef: RefObject<View|null>;
}

const usePanResponder = ({
	visible,
	animating,
	setDragging,
	onDragEnd,
	dragValue,
	dragHandleRef,
}: UsePanResponderProps) => {
	const isScrolledToTopRef = useRef(true);
	const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		isScrolledToTopRef.current = event.nativeEvent.contentOffset.y < 5;
	}, []);

	const dragHandleTop = useRef(0);
	const dragHandleBottom = useRef(0);

	const windowSize = useWindowDimensions();
	// windowSizeKey forces re-measures on window size changes:
	const windowSizeKey = `${windowSize.width}x${windowSize.height}`;
	useLayoutEffect(() => {
		if (!visible || animating || !windowSizeKey) return;

		dragHandleRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
			dragHandleTop.current = pageY;
			dragHandleBottom.current = pageY + height;
		});
	}, [visible, animating, dragHandleRef, windowSizeKey]);

	const panResponder = useMemo(() => {
		const isInDragHandle = (eventY: number) => {
			return eventY >= dragHandleTop.current && eventY <= dragHandleBottom.current;
		};

		// Don't use panResponderCapture on web to prevent buttons from incorrectly being pressed
		const onMoveEvent = Platform.OS === 'android' ? 'onMoveShouldSetPanResponderCapture' as const : 'onMoveShouldSetPanResponder' as const;
		const onStartEvent = Platform.OS === 'android' ? 'onStartShouldSetPanResponderCapture' as const : 'onStartShouldSetPanResponder' as const;
		return PanResponder.create({
			// Check onStart and onMove: On Android, starting drag onMove is unreliable when the menu has scroll
			[onStartEvent]: (event: GestureResponderEvent) => {
				return isInDragHandle(event.nativeEvent.pageY);
			},
			[onMoveEvent]: (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
				if (!isScrolledToTopRef.current) {
					return false;
				}

				if (isInDragHandle(gestureState.moveY)) return true;

				// Use a large tolerance so that buttons in the menu are still clickable, even
				// with a noisy input source:
				const tolerance = 22;
				return Math.abs(gestureState.dx) < 40 && gestureState.dy >= tolerance;
			},
			onPanResponderGrant: () => {
				setDragging(true);
			},
			onPanResponderTerminate: () => {
				setDragging(false);
			},
			onPanResponderMove: Animated.event([
				null,
				// Updates menuDragOffset with the .dy property of the second argument:
				{ dy: dragValue },
			], { useNativeDriver: false }),
			onPanResponderEnd: (_event, gestureState) => {
				onDragEnd(gestureState.dx, gestureState.dy);
				setDragging(false);
			},
		});
	}, [dragValue, onDragEnd, setDragging]);

	return { panResponder, onScroll };
};

interface UseSyncVisibleProps {
	visible: boolean;
	dragToOffset: (offset: number)=> Promise<void>;
	onDismiss: ()=> void;
	containerRef: RefObject<View|null>;
	scrollViewRef: RefObject<ScrollView|null>;
	autoScrollToEnd: boolean;
}

const useUpdateOnVisibilityChange = (props: UseSyncVisibleProps) => {
	const propsRef = useRef(props);
	propsRef.current = props;

	const screenSize = useWindowDimensions();
	const screenSizeRef = useRef(screenSize);
	screenSizeRef.current = screenSize;

	const slideMenuOut = useCallback(() => {
		return new Promise<void>((resolve, reject) => {
			propsRef.current.containerRef.current.measure(async (_x, _y, _width, height, _pageX, pageY) => {
				const menuBottom = screenSizeRef.current.height - (pageY + height);
				try {
					await propsRef.current.dragToOffset(height + menuBottom);
					resolve();
				} catch (error) {
					reject(error);
				}
			});
		});
	}, []);

	useEffect(() => {
		const slideMenuIn = () => propsRef.current.dragToOffset(0);

		if (props.visible) {
			if (propsRef.current.autoScrollToEnd) {
				props.scrollViewRef.current?.scrollToEnd();
			}

			void slideMenuIn();
		}
	}, [props.visible, props.scrollViewRef]);

	const isDismissingRef = useRef(false);
	return useCallback(async () => {
		// Avoid duplicate dismiss animations
		if (isDismissingRef.current) return;
		try {
			isDismissingRef.current = true;

			await slideMenuOut();
			propsRef.current.onDismiss();
		} finally {
			isDismissingRef.current = false;
		}
	}, [slideMenuOut]);
};

const BottomDrawer: React.FC<Props> = props => {
	const menuType = props.menuType ?? MenuType.Docked;
	const theme = themeStyle(props.themeId);
	const [dragging, setDragging] = useState(false);

	const [menuHeight, setMenuHeight] = useState(0);
	const menuHeightRef = useRef(0);
	menuHeightRef.current = menuHeight;

	const menuDragOffset = useMemo(() => (
		// Start with the menu offscreen so that the slide-in animation works.
		// Using the window height as an initial offset ensures that the menu starts completely
		// offscreen.
		new Animated.Value(Dimensions.get('window').height)
	), []);

	const onContainerLayout = useCallback((layout: LayoutChangeEvent) => {
		setMenuHeight(layout.nativeEvent.layout.height);
	}, []);
	const backgroundOpacity = useMemo(() => {
		return Animated.divide(
			Animated.add(Animated.multiply(menuDragOffset, -1), menuHeight), Math.max(menuHeight, 1),
		);
	}, [menuHeight, menuDragOffset]);

	const [animating, setAnimating] = useState(false);
	const menuYOffset = useMemo(() => menuDragOffset, [menuDragOffset]);
	const styles = useStyles({
		theme, menuType: menuType, dragging, alignment: props.alignment, draggable: props.draggable, dragOffset: menuYOffset, backgroundOpacity,
	});

	const reduceMotionEnabled = useReduceMotionEnabled();
	const reduceMotionEnabledRef = useRef(false);
	reduceMotionEnabledRef.current = reduceMotionEnabled;

	const dragToOffset = useCallback(async (offset: number) => {
		const baseAnimationProps = {
			toValue: offset,
			easing: Easing.elastic(0.5),
			duration: reduceMotionEnabledRef.current ? 0 : 250,
			useNativeDriver: true,
		};
		const animation = Animated.timing(menuDragOffset, baseAnimationProps);

		setAnimating(true);
		return new Promise<void>(resolve => {
			animation.start(() => {
				setAnimating(false);
				resolve();
			});
		});
	}, [menuDragOffset]);

	const clearDragOffset = useCallback(() => {
		void dragToOffset(0);
	}, [dragToOffset]);

	const containerRef = useRef<View|null>(null);
	const scrollViewRef = useRef<ScrollView|null>(null);
	const onHide = useUpdateOnVisibilityChange({
		visible: props.visible, dragToOffset, containerRef, onDismiss: props.onDismiss, scrollViewRef, autoScrollToEnd: props.autoScrollToEnd,
	});

	const onDragEnd = useCallback((_dx: number, dy: number) => {
		if (dy > 50) {
			void onHide();
		} else {
			clearDragOffset();
		}
	}, [clearDragOffset, onHide]);

	const dragHandleRef = useRef<View|null>(null);
	const { panResponder, onScroll: onPanResponderScroll } = usePanResponder({
		visible: props.visible,
		animating,
		setDragging,
		onDragEnd,
		dragValue: menuDragOffset,
		dragHandleRef,
	});

	const onScrollDragEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		// Use a smaller tolerance for smaller menus to ensure that they're still dismissible
		const overscrollTolerance = Math.min(80, menuHeightRef.current / 4);

		// On platforms that support overscroll (iOS), support menu dismissal through the
		// native scrollview's overscroll behavior:
		if (offsetY < -overscrollTolerance) {
			// Start the animation at the current scroll position, to avoid a jump when starting
			// the animation:
			menuDragOffset.setValue(-offsetY);
			void onHide();
		}
	}, [onHide, menuDragOffset]);

	return <Modal
		visible={props.visible}
		onClose={onHide}
		onShow={props.onShow}
		backgroundColor='transparent'
		modalBackgroundStyle={styles.modalBackground}
		dismissButtonStyle={styles.dismissButton}
		wrapContent={view => {
			return <>
				<Animated.View style={styles.backgroundStyle}/>
				{view}
			</>;
		}}
		containerStyle={[styles.menuStyle, props.style]}
		animationType={reduceMotionEnabled ? 'fade' : 'none'}
		scrollOverflow={{
			onScroll: onPanResponderScroll,
			onScrollEndDrag: onScrollDragEnd,

			// Throttling scroll events avoids a warning on web
			scrollEventThrottle: 30,

			// Disable scrollbars during in/out animations on web to avoid layout shift
			scrollEnabled: !animating,
			ref: scrollViewRef,
		}}
	>
		<View
			{...panResponder.panHandlers}
			onLayout={onContainerLayout}
			style={[styles.contentContainer, props.contentStyle]}
			ref={containerRef}
		>
			{dragging && <View style={styles.dragOverlay} />}
			<DragHandle
				containerRef={dragHandleRef}
				containerStyle={styles.dragHandleContainer}
				style={styles.dragHandle}
				onDismiss={onHide}
			/>
			{props.children}
		</View>
	</Modal>;
};

const BottomDrawerComponent: React.FC<Omit<Props, 'themeId'>> = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(BottomDrawer);
export default BottomDrawerComponent;


interface DragHandleProps {
	style: ViewStyle;
	containerRef: RefObject<View|null>;
	containerStyle: ViewStyle;

	onDismiss: ()=> void;
}

const DragHandle: React.FC<DragHandleProps> = props => {
	return <Pressable
		onPress={props.onDismiss}
		aria-label={_('Dismiss')}
		style={props.containerStyle}
		ref={props.containerRef}
	>
		<View style={props.style}/>
	</Pressable>;
};

