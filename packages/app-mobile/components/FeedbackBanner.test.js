'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const TestProviderStack_1 = require('./testing/TestProviderStack');
const test_utils_1 = require('@joplin/lib/testing/test-utils');
const waitFor_1 = require('@joplin/lib/testing/waitFor');
const createMockReduxStore_1 = require('../utils/testing/createMockReduxStore');
const setupGlobalStore_1 = require('../utils/testing/setupGlobalStore');
const react_native_1 = require('@testing-library/react-native');
const FeedbackBanner_1 = require('./FeedbackBanner');
const shim_1 = require('@joplin/lib/shim');
let store;
const WrappedFeedbackBanner = () => {
	return React.createElement(TestProviderStack_1.default, { store: store },
		React.createElement(FeedbackBanner_1.default, null));
};
const getFeedbackButton = (positive) => {
	return react_native_1.screen.getByRole('button', { name: positive ? 'Useful' : 'Not useful' });
};
const getSurveyLink = () => {
	return react_native_1.screen.getByRole('button', { name: 'Take survey' });
};
const mockFeedbackServer = (surveyName = 'web-app-test') => {
	let helpfulCount = 0;
	let unhelpfulCount = 0;
	const { reset } = (0, test_utils_1.mockFetch)((request) => {
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
			helpfulCount++;
		} else if (url.pathname === `/r/survey--${surveyName}--unhelpful`) {
			unhelpfulCount++;
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
	const resetMobilePlatform = () => { };
	beforeEach(async () => {
		await (0, test_utils_1.setupDatabase)(0);
		await (0, test_utils_1.switchClient)(0);
		store = (0, createMockReduxStore_1.default)();
		(0, setupGlobalStore_1.default)(store);
		jest.useFakeTimers({ advanceTimers: true });
		(0, test_utils_1.mockMobilePlatform)(shim_1.MobilePlatform.Web);
	});
	afterEach(() => {
		react_native_1.screen.unmount();
		resetMobilePlatform();
	});
	test.each([
		{ platform: shim_1.MobilePlatform.Android, shouldShow: false },
		{ platform: shim_1.MobilePlatform.Web, shouldShow: true },
		{ platform: shim_1.MobilePlatform.Ios, shouldShow: false },
	])('should correctly show/hide the feedback banner on %s', ({ platform, shouldShow }) => {
		(0, test_utils_1.mockMobilePlatform)(platform);
		(0, react_native_1.render)(React.createElement(WrappedFeedbackBanner, null));
		const header = react_native_1.screen.queryByRole('header', { name: 'Feedback' });
		if (shouldShow) {
			expect(header).toBeVisible();
		} else {
			expect(header).toBeNull();
		}
	});
	test('clicking the "Useful" button should submit the response and show the "take survey" link', async () => {
		const feedbackServerMock = mockFeedbackServer();
		(0, react_native_1.render)(React.createElement(WrappedFeedbackBanner, null));
		try {
			const usefulButton = getFeedbackButton(true);
			react_native_1.fireEvent.press(usefulButton);
			await (0, react_native_1.act)(() => (0, waitFor_1.default)(async () => {
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
// # sourceMappingURL=FeedbackBanner.test.js.map
