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

describe('CameraView', () => {
	test('should hide permissions error if camera permission is granted', async () => {
		render(<CameraViewWrapper/>);

		const queryPermissionsError = () => screen.queryByText('Missing camera permission');

		expect(queryPermissionsError()).toBeNull();
		rejectCameraPermission();
		expect(queryPermissionsError()).toBeVisible();
		acceptCameraPermission();
		expect(queryPermissionsError()).toBeNull();

		expect(await screen.findByRole('button', { name: 'Back' })).toBeVisible();
		startCamera();
		expect(await screen.findByRole('button', { name: 'Take picture' })).toBeVisible();
	});
});
