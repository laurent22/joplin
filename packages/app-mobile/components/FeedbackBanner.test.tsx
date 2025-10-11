import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../utils/types';
import TestProviderStack from './testing/TestProviderStack';
import { switchClient, setupDatabase, mockMobilePlatform, mockFetch, waitFor } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../utils/testing/createMockReduxStore';
import setupGlobalStore from '../utils/testing/setupGlobalStore';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FeedbackBanner from './FeedbackBanner';
import { MobilePlatform } from '@joplin/lib/shim';

interface WrapperProps { }

let store: Store<AppState>;
const WrappedFeedbackBanner: React.FC<WrapperProps> = () => {
	return <TestProviderStack store={store}>
		<FeedbackBanner/>
	</TestProviderStack>;
};

const getFeedbackButton = (positive: boolean) => {
	return screen.getByRole('button', { name: positive ? 'Useful' : 'Not useful' });
};

const getSurveyLink = () => {
	return screen.getByRole('button', { name: 'Take survey' });
};

const mockFeedbackServer = (surveyName = 'web-app-test') => {
	let helpfulCount = 0;
	let unhelpfulCount = 0;

	const { reset } = mockFetch((request) => {
		const surveyBaseUrls = [
			'https://objects.joplinusercontent.com/',
			'http://localhost:3430/',
		];
		const isSurveyRequest = surveyBaseUrls.some(url => request.url.startsWith(url));
		if (!isSurveyRequest) {
			return null;
		}

		const url = new URL(request.url);

		if (url.pathname === `/r/survey--${surveyName}--helpful`) {
			helpfulCount ++;
		} else if (url.pathname === `/r/survey--${surveyName}--unhelpful`) {
			unhelpfulCount ++;
		} else {
			return new Response('Not found', { status: 404 });
		}

		// The feedback server always redirects to another URL after a
		// successful request. Mock this by always redirecting to the
		// same URL.
		return new Response('', {
			// See https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/302
			status: 302,
			statusText: 'Found',
			headers: [
				['location', 'https://joplinapp.org'],
			],
		});
	});

	return {
		reset,
		get helpfulCount() {
			return helpfulCount;
		},
		get unhelpfulCount() {
			return unhelpfulCount;
		},
	};
};

describe('FeedbackBanner', () => {
	const resetMobilePlatform = ()=>{};

	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);

		store = createMockReduxStore();
		setupGlobalStore(store);

		jest.useFakeTimers({ advanceTimers: true });
		mockMobilePlatform(MobilePlatform.Web);
	});

	afterEach(() => {
		screen.unmount();
		resetMobilePlatform();
	});

	test.each([
		{ platform: MobilePlatform.Android, shouldShow: false },
		{ platform: MobilePlatform.Web, shouldShow: true },
		{ platform: MobilePlatform.Ios, shouldShow: false },
	])('should correctly show/hide the feedback banner on %s', ({ platform, shouldShow }) => {
		mockMobilePlatform(platform);

		render(<WrappedFeedbackBanner />);

		const header = screen.queryByRole('header', { name: 'Feedback' });
		if (shouldShow) {
			expect(header).toBeVisible();
		} else {
			expect(header).toBeNull();
		}
	});

	test('clicking the "Useful" button should submit the response and show the "take survey" link', async () => {
		const feedbackServerMock = mockFeedbackServer();
		render(<WrappedFeedbackBanner />);

		try {
			const usefulButton = getFeedbackButton(true);
			fireEvent.press(usefulButton);

			await act(() => waitFor(async () => {
				expect(getSurveyLink()).toBeVisible();
			}));

			expect(feedbackServerMock).toMatchObject({
				helpfulCount: 1,
				unhelpfulCount: 0,
			});
		} finally {
			feedbackServerMock.reset();
		}
	});
});
