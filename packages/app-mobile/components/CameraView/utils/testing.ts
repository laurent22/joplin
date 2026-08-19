// Utilities for use with the CameraView.jest.tsx mock

import { fireEvent, screen } from '@testing-library/react-native';

export const rejectCameraPermission = () => {
	const rejectPermissionButton = screen.getByRole('button', { name: 'Reject permission' });
	fireEvent.press(rejectPermissionButton);
};

export const acceptCameraPermission = () => {
	const acceptPermissionButton = screen.getByRole('button', { name: 'Accept permission' });
	fireEvent.press(acceptPermissionButton);
};

export const startCamera = () => {
	const startCameraButton = screen.getByRole('button', { name: 'On camera ready' });
	fireEvent.press(startCameraButton);
};

export const takePhoto = async () => {
	const takePhotoButton = await screen.findByRole('button', { name: 'Take photo' });
	fireEvent.press(takePhotoButton);
};

export const setQrCodeData = (data: string) => {
	const qrCodeDataInput = screen.getByPlaceholderText('QR code data');
	fireEvent.changeText(qrCodeDataInput, data);
};
