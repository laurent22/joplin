import * as React from 'react';
import { RefObject, useCallback, useMemo, useRef } from 'react';
import { GestureResponderEvent, Modal, ModalProps, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	backgroundColor?: string;
}

const useStyles = (backgroundColor?: string) => {
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
				backgroundColor,
				flexGrow: 1,
			},
		});
	}, [isLandscape, backgroundColor]);
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
	...modalProps
}) => {
	const styles = useStyles(backgroundColor);

	// contentWrapper adds padding. To allow styling the region outside of the modal
	// (e.g. to add a background), the content is wrapped twice.
	const content = (
		<View style={containerStyle}>
			{children}
		</View>
	);

	const backgroundRef = useRef<View>();
	const { onShouldBackgroundCaptureTouch, onBackgroundTouchFinished } = useBackgroundTouchListeners(modalProps.onRequestClose, backgroundRef);

	// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
	return (
		<Modal
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			{...modalProps}
		>
			<View
				ref={backgroundRef}
				style={styles.modalBackground}
				onStartShouldSetResponder={onShouldBackgroundCaptureTouch}
				onResponderRelease={onBackgroundTouchFinished}
			>{content}</View>
		</Modal>
	);
};

export default ModalElement;
