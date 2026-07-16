import * as React from 'react';
import { connect } from 'react-redux';
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';
import { themeStyle, ThemeStyle } from './global-style';
import Modal from './Modal';
import { AppState } from '../utils/types';
import useReduceMotionEnabled from '../utils/hooks/useReduceMotionEnabled';
import { _ } from '@joplin/lib/locale';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

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
	backgroundOpacity: Animated.AnimatedInterpolation<number>;
	dragOffset: Animated.AnimatedInterpolation<number>;
}

const useStyles = ({ theme, dragging, draggable, dragOffset, backgroundOpacity }: UseStylesProps) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const safeAreaPadding = useSafeAreaPadding();

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
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 0,
			},
			menuStyle: {
				zIndex: 1,
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
				paddingLeft: 0,
				paddingRight: 0,
				paddingBottom: 0,
				paddingTop: theme.margin + safeAreaPadding.paddingTop,
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
	}, [theme, safeAreaPadding, windowWidth, dragging, draggable, dragOffset, windowHeight, backgroundOpacity]);
};

const useGesture = (
	setDragging: (dragging: boolean)=> void,
	onDragEnd: (dx: number, dy: number)=> void,
	dragValue: Animated.Value,
	scrollViewRef: RefObject<ScrollView|null>,
) => {
	const [scrolledToTop, setScrolledToTop] = useState(true);
	const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		setScrolledToTop(event.nativeEvent.contentOffset.y < 10);
	}, []);

	const gesture = Gesture.Pan()
		.minDistance(22)
		.enabled(scrolledToTop)
		.simultaneousWithExternalGesture(scrollViewRef)
		.onBegin(() => {
			console.log('onStart');

			setDragging(true);
		})
		.onEnd((event) => {
			console.log('onEnd', event.translationY);

			setDragging(false);
			onDragEnd(event.translationX, event.translationY);
		})
		.onUpdate((event) => {
			console.log('onupdate', event.translationY);
			dragValue.setValue(event.translationY);
		});

	return { gesture, onScroll };
};

interface UseSyncVisibleProps {
	visible: boolean;
	dragToOffset: (offset: number)=> Promise<void>;
	onDismiss: ()=> void;
	containerRef: RefObject<View|null>;
}

const useUpdateOnVisibilityChange = (props: UseSyncVisibleProps) => {
	const propsRef = useRef(props);

	const dragDismiss = useCallback(() => {
		return new Promise<void>((resolve, reject) => {
			propsRef.current.containerRef.current.measure(async (_x, _y, _width, height) => {
				try {
					await propsRef.current.dragToOffset(height);
					resolve();
				} catch (error) {
					reject(error);
				}
			});
		});
	}, []);

	useEffect(() => {
		if (props.visible) {
			void propsRef.current.dragToOffset(0);
		} else if (propsRef.current.containerRef.current) {
			void dragDismiss();
		}
	}, [props.visible, dragDismiss]);

	return useCallback(async () => {
		await dragDismiss();
		propsRef.current.onDismiss();
	}, [dragDismiss]);
};

const BottomDrawer: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const [dragging, setDragging] = useState(false);

	const menuDragOffset = useMemo(() => new Animated.Value(0), []);

	const [menuHeight, setMenuHeight] = useState(0);
	const onContainerLayout = useCallback((layout: LayoutChangeEvent) => {
		setMenuHeight(layout.nativeEvent.layout.height);
	}, []);
	const backgroundOpacity = useMemo(() => {
		return Animated.divide(
			Animated.add(Animated.multiply(menuDragOffset, -1), menuHeight), Math.max(menuHeight, 1),
		);
	}, [menuHeight, menuDragOffset]);

	const menuYOffset = useMemo(() => menuDragOffset, [menuDragOffset]);
	const styles = useStyles({ theme, dragging, draggable: props.draggable, dragOffset: menuYOffset, backgroundOpacity });

	const reduceMotionEnabled = useReduceMotionEnabled();
	const reduceMotionEnabledRef = useRef(false);
	reduceMotionEnabledRef.current = reduceMotionEnabled;


	const dragToOffset = useCallback(async (offset: number) => {
		const baseAnimationProps = {
			toValue: offset,
			easing: Easing.elastic(0.5),
			duration: reduceMotionEnabledRef.current ? 0 : 300,
			useNativeDriver: true,
		};
		const animation = Animated.timing(menuDragOffset, baseAnimationProps);

		return new Promise<void>(resolve => {
			animation.start(result => {
				if (result.finished) {
					resolve();
				}
			});
		});
	}, [menuDragOffset]);

	const clearDragOffset = useCallback(() => {
		void dragToOffset(0);
	}, [dragToOffset]);

	const containerRef = useRef<View|null>(null);
	const onHide = useUpdateOnVisibilityChange({
		visible: props.visible, dragToOffset, containerRef, onDismiss: props.onDismiss,
	});

	const onDragEnd = useCallback((_dx: number, dy: number) => {
		if (dy > 50) {
			void onHide();
		} else {
			clearDragOffset();
		}
	}, [clearDragOffset, onHide]);

	const scrollViewRef = useRef<ScrollView|null>(null);
	const { gesture, onScroll: onPanResponderScroll } = useGesture(
		setDragging, onDragEnd, menuDragOffset, scrollViewRef,
	);

	const onContainerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		// On iOS, support menu dismissal through the native scrollview's overscroll behavior:
		if (offsetY < -80) {
			void onHide();
		} else {
			onPanResponderScroll(event);
		}
	}, [onHide, onPanResponderScroll]);

	return <Modal
		visible={props.visible}
		onClose={onHide}
		onShow={props.onShow}
		backgroundColor='transparent'
		modalBackgroundStyle={styles.modalBackground}
		dismissButtonStyle={styles.dismissButton}
		wrapContent={view => {
			return <>
				<GestureHandlerRootView>
					<Animated.View style={styles.backgroundStyle}/>
					{view}
				</GestureHandlerRootView>
			</>;
		}}
		containerStyle={styles.menuStyle}
		animationType={reduceMotionEnabled ? 'fade' : 'none'}
		scrollOverflow={{
			onScroll: onContainerScroll,
			ref: scrollViewRef,
		}}
	>
		<GestureDetector gesture={gesture} touchAction='pan-y'>
			<View
				onLayout={onContainerLayout}
				style={[styles.contentContainer, props.style]}
				ref={containerRef}
			>
				{dragging && <View style={styles.dragOverlay} />}
				<DragHandle
					containerStyle={styles.dragHandleContainer}
					style={styles.dragHandle}
					onDismiss={onHide}
				/>
				{props.children}
			</View>
		</GestureDetector>
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
		aria-label={_('Dismiss')}
		style={props.containerStyle}
		data-isDragHandle={true}
	>
		<View style={props.style} data-isDragHandle={true}/>
	</Pressable>;
};

