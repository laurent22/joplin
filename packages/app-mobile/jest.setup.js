/* eslint-disable jest/require-top-level-describe */

const { afterEachCleanUp, afterAllCleanUp } = require('@joplin/lib/testing/test-utils.js');
const shim = require('@joplin/lib/shim').default;
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const injectedJs = require('./utils/shim-init-react/injectedJs.js').default;
const { mkdir, rm } = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { tmpdir } = require('os');
const uuid = require('@joplin/lib/uuid').default;
const Setting = require('@joplin/lib/models/Setting').default;
const sqlite3 = require('sqlite3');
const React = require('react');
require('../../jest.base-setup.js')();

import { setImmediate } from 'timers';

// Required by some libraries (setImmediate is not supported in most browsers,
// so is removed by jsdom).
window.setImmediate = setImmediate;

shimInit({
	nodeSqlite: sqlite3,
	appVersion: () => require('./package.json').version,
	React,
	sharp,
});
shim.injectedJs = (name) => {
	if (!(name in injectedJs)) {
		throw new Error(`Cannot find injected JS with ID ${name}`);
	}
	return injectedJs[name].js;
};
shim.injectedCss = (name) => {
	if (!(name in injectedJs)) {
		throw new Error(`Cannot find injected CSS with ID ${name}`);
	}
	return injectedJs[name].css;
};
shim.fsDriver().getAppDirectoryPath = () => {
	// On mobile, the rootProfileDirectory and the app directory
	// (RNFetchBlob's DocumentDir) match the root profile directory
	// by default.
	return Setting.value('rootProfileDir');
};

// This library has the following error when running within Jest:
//   Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.
jest.mock('react-native-device-info', () => {
	return {
		hasNotch: () => false,
	};
});

// react-native-version-info doesn't work (returns undefined for .version) when
// running in a testing environment.
jest.doMock('react-native-version-info', () => {
	return {
		default: {
			appVersion: require('./package.json').version,
		},
	};
});

// react-native-webview expects native iOS/Android code so needs to be mocked.
jest.mock('./components/ExtendedWebView', () => {
	return require('./components/ExtendedWebView/index.jest.js');
});

jest.mock('./components/CameraView/Camera', () => {
	return require('./components/CameraView/Camera/index.jest');
});

jest.mock('@react-native-clipboard/clipboard', () => {
	return { default: { getString: jest.fn(), setString: jest.fn() } };
});

const emptyMockPackages = [
	'react-native-share',
	'react-native-file-viewer',
	'react-native-image-picker',
	'@react-native-documents/picker',
	'@joplin/react-native-saf-x',
	'expo-av',
	'expo-av/build/Audio',
];
for (const packageName of emptyMockPackages) {
	jest.doMock(packageName, () => {
		return { default: { } };
	});
}

jest.mock('react-native-file-viewer', () => {
	return { default: { } };
});

jest.mock('react-native-image-picker', () => {
	return { default: { } };
});

jest.mock('react-native-zip-archive', () => {
	return { default: { } };
});

jest.mock('@react-native-documents/picker', () => ({ default: { } }));

// This is one of the icon libraries that react-native-paper attempts to use.
// Throwing an Error causes react-native-paper to select a different icon library
// that better supports our automated testing environment.
jest.doMock('@expo/vector-icons/MaterialCommunityIcons', () => {
	throw new Error('Not supported in testing environments.');
});

const mockIconLibrary = (libraryName, exportName) => {
	jest.doMock(libraryName, () => {
		const MockIconComponent = require('react-native').View;
		return {
			default: MockIconComponent,
			[exportName]: MockIconComponent,
		};
	});
};

mockIconLibrary('@react-native-vector-icons/ionicons', 'Ionicons');
mockIconLibrary('@react-native-vector-icons/material-design-icons', 'MaterialDesignIcons');
mockIconLibrary('@react-native-vector-icons/fontawesome5', 'FontAwesome5');

// react-native-fs's CachesDirectoryPath export doesn't work in a testing environment.
// Use a temporary folder instead.
const tempDirectoryPath = path.join(tmpdir(), `appmobile-test-${uuid.createNano()}`);

jest.doMock('react-native-fs', () => {
	return {
		CachesDirectoryPath: tempDirectoryPath,
	};
});

shim.fsDriver().getCacheDirectoryPath = () => {
	return tempDirectoryPath;
};

beforeAll(async () => {
	await mkdir(tempDirectoryPath);
});

afterEach(async () => {
	await afterEachCleanUp();
});

afterAll(async () => {
	await afterAllCleanUp();
	await rm(tempDirectoryPath, { recursive: true });
});
