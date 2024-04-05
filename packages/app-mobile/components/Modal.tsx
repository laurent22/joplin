import * as React from 'react';
import { Modal, ModalProps, StyleSheet, View, ViewStyle } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	elevation?: number;
}

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	...modalProps
}) => {
	// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
	return (
		<Modal
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			{...modalProps}
		>
			<View style={[styleSheet.modalContainer, containerStyle ? containerStyle : null]}>
				{children}
			</View>
		</Modal>
	);
};

const styleSheet = StyleSheet.create({
	modalContainer: {
		marginTop: hasNotch() ? 65 : 15,
		marginBottom: hasNotch() ? 35 : 15,
	},
});

export default ModalElement;
