import * as React from 'react';
import FocusControl from './FocusControl/FocusControl';
import { render } from '../../utils/testing/testingLibrary';
import AccessibleView from './AccessibleView';
import { AccessibilityInfo } from 'react-native';
import ModalWrapper from './FocusControl/ModalWrapper';
import { ModalState } from './FocusControl/types';
import { findNodeHandle } from 'react-native';

interface TestContentWrapperProps {
	mainContent: React.ReactNode;
	dialogs: React.ReactNode;
}

const TestContentWrapper: React.FC<TestContentWrapperProps> = props => {
	return <FocusControl.Provider>
		{props.dialogs}
		<FocusControl.MainAppContent>
			{props.mainContent}
		</FocusControl.MainAppContent>
	</FocusControl.Provider>;
};

jest.mock('react-native', () => {
	const ReactNative = jest.requireActual('react-native');
	ReactNative.AccessibilityInfo.setAccessibilityFocus = jest.fn();
	const findNodeHandle = jest.fn((): null|number => null);

	return new Proxy(ReactNative, {
		get: (target, property) => {
			if (property === 'findNodeHandle') return findNodeHandle;
			return target[property];
		},
	});
});

describe('AccessibleView', () => {
	const findNodeHandleMock = findNodeHandle as jest.Mock;
	beforeEach(() => {
		findNodeHandleMock.mockRestore();
	});

	test('should wait for the currently-open dialog to dismiss before applying focus requests', () => {
		const setFocusMock = AccessibilityInfo.setAccessibilityFocus as jest.Mock;
		setFocusMock.mockClear();
		// Mock findNodeHandle: In a testing environment, it always returns null:
		findNodeHandleMock.mockImplementation(() => 1);

		interface TestContentOptions {
			modalState: ModalState;
			refocusCounter: undefined|number;
		}
		const renderTestContent = ({ modalState, refocusCounter }: TestContentOptions) => {
			const mainContent = <AccessibleView refocusCounter={refocusCounter}/>;
			const visibleDialog = <ModalWrapper state={modalState}>{null}</ModalWrapper>;
			return <TestContentWrapper
				mainContent={mainContent}
				dialogs={visibleDialog}
			/>;
		};

		render(renderTestContent({
			refocusCounter: undefined,
			modalState: ModalState.Open,
		}));

		// Increasing the refocusCounter for a background view while a dialog is visible
		// should not try to focus the background view.
		render(renderTestContent({
			refocusCounter: 1,
			modalState: ModalState.Open,
		}));
		expect(setFocusMock).not.toHaveBeenCalled();

		// Focus should not be set until done closing
		render(renderTestContent({
			refocusCounter: 1,
			modalState: ModalState.Closing,
		}));
		expect(setFocusMock).not.toHaveBeenCalled();

		// Keeping the same refocus counter, but dismissing the dialog should focus
		// the test view.
		render(renderTestContent({
			refocusCounter: 1,
			modalState: ModalState.Closed,
		}));
		expect(setFocusMock).toHaveBeenCalled();
	});
});
