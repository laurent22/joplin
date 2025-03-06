import * as React from 'react';
import CameraView from './CameraView';
import { CameraResult } from './types';
import { fireEvent, render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import TestProviderStack from '../testing/TestProviderStack';

interface WrapperProps {
	onPhoto?: (result: CameraResult)=> void;
	onInsertBarcode?: (text: string)=> void;
	onCancel?: ()=> void;
}

const emptyFn = ()=>{};
const store = createMockReduxStore();
const CameraViewWrapper: React.FC<WrapperProps> = props => {
	return <TestProviderStack store={store}>
		<CameraView
			style={{}}
			onPhoto={props.onPhoto ?? emptyFn}
			onInsertBarcode={props.onInsertBarcode ?? emptyFn}
			onCancel={props.onCancel ?? emptyFn}
		/>
	</TestProviderStack>;
};

const rejectCameraPermission = () => {
	const rejectPermissionButton = screen.getByRole('button', { name: 'Reject permission' });
	fireEvent.press(rejectPermissionButton);
};

const acceptCameraPermission = () => {
	const acceptPermissionButton = screen.getByRole('button', { name: 'Accept permission' });
	fireEvent.press(acceptPermissionButton);
};

const startCamera = () => {
	const startCameraButton = screen.getByRole('button', { name: 'On camera ready' });
	fireEvent.press(startCameraButton);
};

const setQrCodeData = (data: string) => {
	const qrCodeDataInput = screen.getByPlaceholderText('QR code data');
	fireEvent.changeText(qrCodeDataInput, data);
};

describe('CameraView', () => {
	test('should hide permissions error if camera permission is granted', async () => {
		const view = render(<CameraViewWrapper/>);

		const queryPermissionsError = () => screen.queryByText('Missing camera permission');

		expect(queryPermissionsError()).toBeNull();
		rejectCameraPermission();
		expect(queryPermissionsError()).toBeVisible();
		acceptCameraPermission();
		expect(queryPermissionsError()).toBeNull();

		expect(await screen.findByRole('button', { name: 'Back' })).toBeVisible();
		startCamera();
		expect(await screen.findByRole('button', { name: 'Take photo' })).toBeVisible();

		view.unmount();
	});

	test('should allow inserting QR code text', async () => {
		const onInsertBarcode = jest.fn();
		const view = render(<CameraViewWrapper onInsertBarcode={onInsertBarcode}/>);
		acceptCameraPermission();
		startCamera();

		const qrCodeData = 'Test!';
		setQrCodeData(qrCodeData);

		const qrCodeButton = await screen.findByRole('button', { name: 'QR Code' });
		expect(qrCodeButton).toBeVisible();
		fireEvent.press(qrCodeButton);

		const addToNoteButton = await screen.findByRole('button', { name: 'Add to note' });
		fireEvent.press(addToNoteButton);

		expect(onInsertBarcode).toHaveBeenCalledTimes(1);
		expect(onInsertBarcode).toHaveBeenCalledWith(qrCodeData);

		view.unmount();
	});
});
