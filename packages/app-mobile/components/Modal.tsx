import * as React from 'react';
import { RefObject, useCallback, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Modal, ModalProps, Platform, Pressable, ScrollView, ScrollViewProps, StyleSheet, View, ViewStyle } from 'react-native';
import FocusControl from './accessibility/FocusControl/FocusControl';
import { msleep, Second } from '@joplin/utils/time';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { ModalState } from './accessibility/FocusControl/types';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';
import { _ } from '@joplin/lib/locale';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	backgroundColor?: string;
	modalBackgroundStyle?: ViewStyle;
	// Extra styles for the accessibility tools dismiss button. For example,
	// this might be used to display the dismiss button near the top of the
	// screen (rather than the bottom).
	dismissButtonStyle?: ViewStyle;

	// If scrollOverflow is provided, the modal is wrapped in a vertical
	// ScrollView. This allows the user to scroll parts of dialogs into
	// view that would otherwise be clipped by the screen edge.
	scrollOverflow?: boolean|ScrollViewProps;
}

const useStyles = (hasScrollView: boolean, backgroundColor: string|undefined) => {
	const safeAreaPadding = useSafeAreaPadding();
	return useMemo(() => {
		return StyleSheet.create({
			modalBackground: {
				...safeAreaPadding,
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
			dismissButton: {
				position: 'absolute',
				bottom: 0,
				height: 12,
				width: '100%',
				zIndex: -1,
			},
		});
	}, [hasScrollView, safeAreaPadding, backgroundColor]);
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

const useModalStatus = (containerComponent: View|null, visible: boolean) => {
	const contentMounted = !!containerComponent;
	const [controlsFocus, setControlsFocus] = useState(false);
	useAsyncEffect(async (event) => {
		if (contentMounted) {
			setControlsFocus(true);
		} else {
			// Accessibility: Work around Android's default focus-setting behavior.
			// By default, React Native's Modal on Android sets focus about 0.8 seconds
			// after the modal is dismissed. As a result, the Modal controls focus until
			// roughly one second after the modal is dismissed.
			if (Platform.OS === 'android') {
				await msleep(Second);
			}

			if (!event.cancelled) {
				setControlsFocus(false);
			}
		}
	}, [contentMounted]);

	let modalStatus = ModalState.Closed;
	if (controlsFocus) {
		modalStatus = visible ? ModalState.Open : ModalState.Closing;
	} else if (visible) {
		modalStatus = ModalState.Open;
	}
	return modalStatus;
};

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	backgroundColor,
	scrollOverflow,
	modalBackgroundStyle: extraModalBackgroundStyles,
	dismissButtonStyle,
	...modalProps
}) => {
	const styles = useStyles(!!scrollOverflow, backgroundColor);

	// contentWrapper adds padding. To allow styling the region outside of the modal
	// (e.g. to add a background), the content is wrapped twice.
	const content = (
		<View style={containerStyle}>
			{children}
		</View>
	);


	const [containerComponent, setContainerComponent] = useState<View|null>(null);
	const modalStatus = useModalStatus(containerComponent, modalProps.visible);

	const containerRef = useRef<View|null>(null);
	containerRef.current = containerComponent;
	const { onShouldBackgroundCaptureTouch, onBackgroundTouchFinished } = useBackgroundTouchListeners(modalProps.onRequestClose, containerRef);

	// A close button for accessibility tools. Since iOS accessibility focus order is based on the position
	// of the element on the screen, the close button is placed after the modal content, rather than behind.
	const closeButton = modalProps.onRequestClose ? <Pressable
		style={[styles.dismissButton, dismissButtonStyle]}
		onPress={modalProps.onRequestClose}
		accessibilityLabel={_('Close dialog')}
		accessibilityRole='button'
	/> : null;

	const contentAndBackdrop = <View
		ref={setContainerComponent}
		style={[styles.modalBackground, extraModalBackgroundStyles]}
		onStartShouldSetResponder={onShouldBackgroundCaptureTouch}
		onResponderRelease={onBackgroundTouchFinished}
	>
		{content}
		{closeButton}
	</View>;

	const extraScrollViewProps = (typeof scrollOverflow === 'object' ? scrollOverflow : {});
	return (
		<FocusControl.ModalWrapper state={modalStatus}>
			<Modal
				// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
				supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
				{...modalProps}
			>
				{scrollOverflow ? (
					<ScrollView
						{...extraScrollViewProps}
						style={[styles.modalScrollView, extraScrollViewProps.style]}
						contentContainerStyle={[styles.modalScrollViewContent, extraScrollViewProps.contentContainerStyle]}
					>{contentAndBackdrop}</ScrollView>
				) : contentAndBackdrop}
			</Modal>
		</FocusControl.ModalWrapper>
	);
};

export default ModalElement;
