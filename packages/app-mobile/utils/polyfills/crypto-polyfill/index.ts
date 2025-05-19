import 'react-native-get-random-values';

// nanoid uses require('crypto').getRandomValues, which doesn't work in React Native.
// This file is a partial polyfill for the NodeJS crypto module.

// eslint-disable-next-line import/prefer-default-export -- This needs to match the exports from NodeJS crypto
export const getRandomValues = (array: ArrayBufferView<ArrayBufferLike>) => {
	return crypto.getRandomValues(array);
};
