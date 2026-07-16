import * as React from 'react';
import { connect } from 'react-redux';
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, NativeScrollEvent, NativeScrollPoint, NativeSyntheticEvent, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';
import { themeStyle, ThemeStyle } from './global-style';
import Modal from './Modal';
import { AppState } from '../utils/types';
import useReduceMotionEnabled from '../utils/hooks/useReduceMotionEnabled';
import { _ } from '@joplin/lib/locale';

interface Props {
	themeId: number;
	style: ViewStyle;
	children: React.ReactNode;
	visible: boolean;
	draggable: boolean;
	onDismiss: ()=> void;
	onShow?: ()=> void;
}

interface UseStylesProps {
	theme: ThemeStyle;
	dragging: boolean;
	draggable: boolean;
	dragOffset: Animated.AnimatedInterpolation<number>;
}

const useStyles = ({ theme, dragging, draggable, dragOffset }: UseStylesProps) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const safeAreaPadding = useSafeAreaPadding();

	return useMemo(() => {
		const isSmallWidthScreen = windowWidth < 500;
		const menuGapLeft = safeAreaPadding.paddingLeft + 6;
		const menuGapRight = safeAreaPadding.paddingRight + 6;

		// On web, any spaceBelowScreenEdge results in a scrollbar and extra scroll.
		const spaceBelowScreenEdge = Platform.OS === 'web' ? 0 : windowHeight;

		return StyleSheet.create({
			menuStyle: {
				alignSelf: 'flex-end',
				...(isSmallWidthScreen ? {
					// Center on small screens, rather than float right.
					alignSelf: 'center',
				} : {}),
				flexDirection: 'row',
				marginRight: menuGapRight,
				marginLeft: menuGapLeft,

				backgroundColor: theme.backgroundColor,
				borderRadius: 16,
				borderBottomRightRadius: 0,
				borderBottomLeftRadius: 0,
				maxWidth: Math.min(400, windowWidth - menuGapRight - menuGapLeft),

				marginBottom: -spaceBelowScreenEdge,

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

				marginBottom: spaceBelowScreenEdge,

				// The drag handle should be at the very top of the menu
				paddingTop: draggable ? 0 : undefined,
				paddingBottom: 14 + safeAreaPadding.paddingBottom,
				padding: 20,
			},
			modalBackground: {
				paddingTop: 0,
				paddingLeft: 0,
				paddingRight: 0,
				paddingBottom: 0,
				justifyContent: 'flex-end',
				flexDirection: 'column',
			},
			dismissButton: {
				top: 0,
				bottom: undefined,
				height: theme.marginMedium,
			},

			dragHandleContainer: {
				display: draggable ? 'flex' : 'none',
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
	}, [theme, safeAreaPadding, windowWidth, dragging, draggable, dragOffset, windowHeight]);
};

const usePanResponder = (
	setDragging: (dragging: boolean)=> void,
	onDragEnd: (dx: number, dy: number)=> void,
	dragValue: Animated.Value,
) => {
	const currentScrollRef = useRef<NativeScrollPoint|null>(null);
	const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		currentScrollRef.current = event.nativeEvent.contentOffset;
	}, []);
	const panResponder = useMemo(() => {
		return PanResponder.create({
			// Don't use panResponderCapture
			onMoveShouldSetPanResponder: (_event, gestureState) => {
				if (currentScrollRef.current) {
					const top = currentScrollRef.current.y;

					const tolerance = 3;
					if (top > tolerance && gestureState.dy > 0) return false;
				}
				// Use a large tolerance so that buttons in the menu are still clickable, even
				// with a noisy input source:
				return Math.abs(gestureState.dx) < 40 && gestureState.dy > 22;
			},
			onPanResponderGrant: () => {
				setDragging(true);
			},
			onPanResponderTerminate: () => setDragging(false),
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
	dragToOffset: (offset: number)=> void;
	containerRef: RefObject<View|null>;
}

const useUpdateOnVisibilityChange = (props: UseSyncVisibleProps) => {
	const propsRef = useRef(props);
	useEffect(() => {
		if (props.visible) {
			propsRef.current.dragToOffset(0);
		} else {
			propsRef.current.containerRef.current?.measure((_x, _y, _width, height) => {
				propsRef.current.dragToOffset(height);
			});
		}
	}, [props.visible]);
};

const BottomDrawer: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const [dragging, setDragging] = useState(false);

	const menuDragOffset = useMemo(() => new Animated.Value(0), []);
	const menuYOffset = useMemo(() => menuDragOffset, [menuDragOffset]);
	const styles = useStyles({ theme, dragging, draggable: props.draggable, dragOffset: menuYOffset });

	const reduceMotionEnabled = useReduceMotionEnabled();
	const reduceMotionEnabledRef = useRef(false);
	reduceMotionEnabledRef.current = reduceMotionEnabled;

	const dragToOffset = useCallback((offset: number) => {
		const animation = Animated.timing(menuDragOffset, {
			toValue: offset,
			easing: Easing.elastic(0.5),
			duration: reduceMotionEnabledRef.current ? 0 : 200,
			useNativeDriver: true,
		});
		animation.start();
	}, [menuDragOffset]);

	const clearDragOffset = useCallback(() => {
		dragToOffset(0);
	}, [dragToOffset]);

	const containerRef = useRef<View|null>(null);
	useUpdateOnVisibilityChange({
		visible: props.visible, dragToOffset, containerRef,
	});

	const onDragEnd = useCallback((_dx: number, dy: number) => {
		if (dy > 50) {
			props.onDismiss();
		} else {
			clearDragOffset();
		}
	}, [clearDragOffset, props.onDismiss]);

	const { panResponder, onScroll: onPanResponderScroll } = usePanResponder(
		setDragging, onDragEnd, menuDragOffset,
	);

	const onContainerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		// On iOS, support menu dismissal through the native scrollview's overscroll behavior:
		if (offsetY < -80) {
			props.onDismiss();
		} else {
			onPanResponderScroll(event);
		}
	}, [props.onDismiss, onPanResponderScroll]);

	return <Modal
		visible={props.visible}
		onClose={props.onDismiss}
		onShow={props.onShow}
		backgroundColor={theme.backgroundColorTransparent2}
		modalBackgroundStyle={styles.modalBackground}
		dismissButtonStyle={styles.dismissButton}
		containerStyle={styles.menuStyle}
		scrollOverflow={{
			onScroll: onContainerScroll,
		}}
	>
		<View {...panResponder.panHandlers} style={[styles.contentContainer, props.style]} ref={containerRef}>
			{dragging && <View style={styles.dragOverlay} />}
			<DragHandle
				containerStyle={styles.dragHandleContainer}
				style={styles.dragHandle}
				onDismiss={props.onDismiss}
			/>
			{props.children}
		</View>
	</Modal>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(BottomDrawer);


interface DragHandleProps {
	style: ViewStyle;
	containerStyle: ViewStyle;

	onDismiss: ()=> void;
}

const DragHandle: React.FC<DragHandleProps> = props => {
	return <Pressable
		onPress={props.onDismiss}
		style={props.containerStyle}
		aria-label={_('Dismiss')}
	>
		<View style={props.style}/>
	</Pressable>;
};

