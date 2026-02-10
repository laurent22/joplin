// ESLint's no-undef rule doesn't understand TypeScript declaration files
// where types like Key and ReactNode are imported via module augmentation.
/* eslint-disable no-undef */

// This file fixes React Native type compatibility with React 19.
// React 19 changed JSX element type requirements, and React Native's types
// haven't fully caught up yet. This augmentation ensures components like
// Text, View, etc. are recognized as valid JSX components.
//
// See: https://github.com/facebook/react-native/issues/46828

import 'react';

declare module 'react' {
	// In React 19, ReactNode includes ReactPortal which extends ReactElement but
	// adds a required `children` property. This causes issues because React Native
	// components return ReactElement without `children`.
	// Making `children` optional in ReactPortal allows ReactElement to be
	// assignable to ReactNode again.
	//
	// Also, React 19's ReactElement has key: string | null, but React Native
	// uses Key (string | number). We relax this constraint as well.
	interface ReactPortal {
		key?: Key | null;
		children?: ReactNode | undefined;
	}
}
