import * as React from 'react';
import { RefObject, useCallback, useMemo, useRef } from 'react';
import { GestureResponderEvent, Modal, ModalProps, ScrollView, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	backgroundColor?: string;

	// If scrollOverflow is provided, the modal is wrapped in a vertical
	// ScrollView. This allows the user to scroll parts of dialogs into
	// view that would otherwise be clipped by the screen edge.
	scrollOverflow?: boolean;
}

const useStyles = (hasScrollView: boolean, backgroundColor: string|undefined) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const isLandscape = windowWidth > windowHeight;
	return useMemo(() => {
		const backgroundPadding: ViewStyle = isLandscape ? {
			paddingRight: hasNotch() ? 60 : 0,
			paddingLeft: hasNotch() ? 60 : 0,
			paddingTop: 15,
			paddingBottom: 15,
		} : {
			paddingTop: hasNotch() ? 65 : 15,
			paddingBottom: hasNotch() ? 35 : 15,
		};
		return StyleSheet.create({
			modalBackground: {
				...backgroundPadding,
				flexGrow: 1,
				flexShrink: 1,

				// When hasScrollView, the modal background is wrapped in a ScrollView. In this case, it's
				// possible to scroll content outside the background into view. To prevent the edge of the
				// background from being visible, the background color is applied to the ScrollView container
				// instead:
				backgroundColor: hasScrollView ? null : backgroundColor,
			},
			modalScrollView: {
				backgroundColor,
				flexGrow: 1,
				flexShrink: 1,
			},
			modalScrollViewContent: {
				// Make the scroll view's scrolling region at least as tall as its container.
				// This makes it possible to vertically center the content of scrollable modals.
				flexGrow: 1,
			},
		});
	}, [hasScrollView, isLandscape, backgroundColor]);
};

const useBackgroundTouchListeners = (onRequestClose: (event: GestureResponderEvent)=> void, backdropRef: RefObject<View>) => {
	const onShouldBackgroundCaptureTouch = useCallback((event: GestureResponderEvent) => {
		return event.target === backdropRef.current && event.nativeEvent.touches.length === 1;
	}, [backdropRef]);

	const onBackgroundTouchFinished = useCallback((event: GestureResponderEvent) => {
		if (event.target === backdropRef.current) {
			onRequestClose?.(event);
		}
	}, [onRequestClose, backdropRef]);

	return { onShouldBackgroundCaptureTouch, onBackgroundTouchFinished };
};

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	backgroundColor,
	scrollOverflow,
	...modalProps
}) => {
	const styles = useStyles(scrollOverflow, backgroundColor);

	// contentWrapper adds padding. To allow styling the region outside of the modal
	// (e.g. to add a background), the content is wrapped twice.
	const content = (
		<View style={containerStyle}>
			{children}
		</View>
	);

	const backgroundRef = useRef<View>();
	const { onShouldBackgroundCaptureTouch, onBackgroundTouchFinished } = useBackgroundTouchListeners(modalProps.onRequestClose, backgroundRef);

	const contentAndBackdrop = <View
		ref={backgroundRef}
		style={styles.modalBackground}
		onStartShouldSetResponder={onShouldBackgroundCaptureTouch}
		onResponderRelease={onBackgroundTouchFinished}
	>{content}</View>;

	// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
	return (
		<Modal
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			{...modalProps}
		>
			{scrollOverflow ? (
				<ScrollView
					style={styles.modalScrollView}
					contentContainerStyle={styles.modalScrollViewContent}
				>{contentAndBackdrop}</ScrollView>
			) : contentAndBackdrop}
		</Modal>
	);
};

export default ModalElement;
