/* eslint-disable jest/require-top-level-describe */

import jest_base_setup_96 from '../../jest.base-setup.js';
import { version as version_97 } from './package.json';
import { version as version_98 } from './package.json';
import index_jest_99 from './components/ExtendedWebView/index.jest.js';
import index_100 from './components/CameraView/Camera/index.jest';
import { afterEachCleanUp, afterAllCleanUp } from '@joplin/lib/testing/test-utils.js';
import shim from '@joplin/lib/shim';
import { shimInit } from '@joplin/lib/shim-init-node.js';
import injectedJs from './utils/shim-init-react/injectedJs.js';
import { mkdir, rm } from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { tmpdir } from 'os';
import uuid from '@joplin/lib/uuid';
import Setting from '@joplin/lib/models/Setting';
import sqlite3 from 'sqlite3';
import React from 'react';
import { View as MockIconComponent } from 'react-native';
import { setImmediate } from 'timers';
jest_base_setup_96();


// Required by some libraries (setImmediate is not supported in most browsers,
// so is removed by jsdom).
window.setImmediate = setImmediate;

shimInit({
	nodeSqlite: sqlite3,
	appVersion: () => version_97,
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
			appVersion: version_98,
		},
	};
});

// react-native-webview expects native iOS/Android code so needs to be mocked.
jest.mock('./components/ExtendedWebView', () => {
	return index_jest_99;
});

jest.mock('./components/CameraView/Camera', () => {
	return index_100;
});

jest.mock('@react-native-clipboard/clipboard', () => {
	return { default: { getString: jest.fn(), setString: jest.fn() } };
});

jest.doMock('expo-audio', () => {
	return {
		AudioQuality: {
			MIN: 'min',
		},
		IOSOutputFormat: {
			MPEG4AAC: 'mpeg4aac',
		},
		getRecordingPermissionsAsync: jest.fn(async () => ({
			status: 'granted',
			granted: true,
		})),
		requestRecordingPermissionsAsync: jest.fn(async () => ({
			status: 'granted',
			granted: true,
		})),
		setAudioModeAsync: jest.fn(async () => null),
		useAudioRecorder: jest.fn(() => ({
			prepareToRecordAsync: jest.fn(async () => null),
			record: jest.fn(),
			stop: jest.fn(async () => null),
			uri: null,
		})),
		useAudioRecorderState: jest.fn(() => ({
			durationMillis: 0,
		})),
	};
});

const emptyMockPackages = [
	'react-native-share',
	'react-native-file-viewer',
	'react-native-image-picker',
	'@react-native-documents/picker',
	'@joplin/react-native-saf-x',
	'expo-image-manipulator',
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

jest.doMock('@dr.pogodin/react-native-fs', () => {
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
