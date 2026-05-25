
// nanoid uses getRandomValues_145, which doesn't work in React Native.
// This file is a partial polyfill for the NodeJS crypto module.

// eslint-disable-next-line import/prefer-default-export -- This needs to match the exports from NodeJS crypto
import { getRandomValues as getRandomValues_145 } from 'crypto';
import 'react-native-get-random-values';
export const getRandomValues = (array: ArrayBufferView<ArrayBufferLike>) => {
	return crypto.getRandomValues(array);
};
