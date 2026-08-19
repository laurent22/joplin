import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import CameraViewMultiPage from './CameraViewMultiPage';
import { CameraResult, OnInsertBarcode } from './types';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { startCamera, takePhoto } from './utils/testing';
import { useState } from 'react';

interface WrapperProps {
	onComplete?: (finalPhotos: CameraResult[])=> void;
	onCancel?: ()=> void;
	onInsertBarcode?: OnInsertBarcode;
}

let store: Store<AppState>;
const WrappedCamera: React.FC<WrapperProps> = ({
	onComplete = jest.fn(),
	onInsertBarcode = jest.fn(),
	onCancel = jest.fn(),
}) => {
	const [photos, setPhotos] = useState<CameraResult[]>([]);

	return <TestProviderStack store={store}>
		<CameraViewMultiPage
			themeId={Setting.THEME_LIGHT}
			photos={photos}
			onSetPhotos={setPhotos}
			onCancel={onCancel}
			onComplete={() => onComplete(photos)}
			onInsertBarcode={onInsertBarcode}
		/>
	</TestProviderStack>;
};

const getNextButton = () => screen.getByRole('button', { name: 'Next' });
const queryPhotoCount = () => screen.queryByTestId('photo-count');

describe('CameraViewMultiPage', () => {
	beforeEach(() => {
		store = createMockReduxStore();
	});

	test('next button should be disabled until a photo has been taken', async () => {
		render(<WrappedCamera/>);
		expect(getNextButton()).toBeDisabled();
		startCamera();
		// Should still be disabled after starting the camera
		expect(getNextButton()).toBeDisabled();

		await takePhoto();
		await waitFor(() => {
			expect(getNextButton()).not.toBeDisabled();
		});
	});

	test('should show a count of the number of photos taken', async () => {
		render(<WrappedCamera/>);
		startCamera();

		expect(queryPhotoCount()).toBeNull();

		for (let i = 1; i < 3; i++) {
			await takePhoto();
			await waitFor(() => {
				expect(queryPhotoCount()).toHaveTextContent(String(i));
			});
		}
	});

	test('pressing "Next" should call onComplete with photo URI(s)', async () => {
		const onComplete = jest.fn();
		render(<WrappedCamera onComplete={onComplete}/>);
		startCamera();

		await takePhoto();
		await waitFor(() => {
			expect(getNextButton()).not.toBeDisabled();
		});

		fireEvent.press(getNextButton());

		const imageResults: CameraResult[] = onComplete.mock.lastCall[0];
		expect(imageResults).toHaveLength(1);
		expect(imageResults[0].uri).toBeTruthy();
	});
});
