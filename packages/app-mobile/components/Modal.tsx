import * as React from 'react';
import { Modal, ModalProps, StyleSheet, View, ViewStyle } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
  children: React.ReactNode;
	containerStyle?: ViewStyle;
	elevation?: Number;
}

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	...modalProps
}) => {
	return (
		<Modal {...modalProps}>
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
