import * as React from 'react';
import { useMemo } from 'react';
import { Modal, ModalProps, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	elevation?: number;
}

const useStyles = () => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const isLandscape = windowWidth > windowHeight;
	return useMemo(() => {
		return StyleSheet.create({
			modalContainer: isLandscape ? {
				marginRight: hasNotch() ? 60 : 0,
				marginLeft: hasNotch() ? 60 : 0,
				marginTop: 15,
				marginBottom: 15,
			} : {
				marginTop: hasNotch() ? 65 : 15,
				marginBottom: hasNotch() ? 35 : 15,
			},
		});
	}, [isLandscape]);
};

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	...modalProps
}) => {
	const styles = useStyles();

	// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
	return (
		<Modal
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			{...modalProps}
			style={{ flex: 1, justifyContent: 'center', paddingRight: 100 }}
		>
			<View style={[styles.modalContainer, containerStyle]}>
				{children}
			</View>
		</Modal>
	);
};

export default ModalElement;
