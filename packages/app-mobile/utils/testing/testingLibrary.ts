import * as testingLibrary from '@testing-library/react-native';

// This file wraps @testing-library/react-native to allow configuring it
// only if it's going to be used. Attempting to do this with a jest.mock
// fails with "Cannot add a hook after tests have started running. Hooks must be defined synchronously."
// Calling .configure for all tests causes jsdom-based tests to fail.
testingLibrary.configure({
	// The default timeout of 1_000 ms is often too low in CI.
	asyncUtilTimeout: 5_000,
});

export * from '@testing-library/react-native';
