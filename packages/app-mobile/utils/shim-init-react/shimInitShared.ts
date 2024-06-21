import { Linking, Platform } from 'react-native';
import injectedJs from './injectedJs';
import type ShimType from '@joplin/lib/shim';
import PoorManIntervals from '@joplin/lib/PoorManIntervals';
import showMessageBox from '../showMessageBox';
import { Buffer } from 'buffer';
const shim: typeof ShimType = require('@joplin/lib/shim').default;

const shimInitShared = () => {
	shim.Geolocation = null;
	shim.sjclModule = require('@joplin/lib/vendor/sjcl-rn.js');

	shim.stringByteLength = function(string) {
		return Buffer.byteLength(string, 'utf-8');
	};

	shim.Buffer = Buffer;

	shim.stringByteLength = function(string) {
		return Buffer.byteLength(string, 'utf-8');
	};

	shim.openUrl = url => {
		return Linking.openURL(url);
	};

	shim.showMessageBox = showMessageBox;

	shim.waitForFrame = () => {
		return new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	};

	shim.mobilePlatform = () => {
		return Platform.OS;
	};

	shim.injectedJs = function(name) {
		if (!(name in injectedJs)) throw new Error(`Cannot find injectedJs file (add it to "injectedJs" object): ${name}`);
		return injectedJs[name as keyof typeof injectedJs];
	};

	shim.setTimeout = (fn, interval) => {
		return PoorManIntervals.setTimeout(fn, interval);
	};

	shim.setInterval = (fn, interval) => {
		return PoorManIntervals.setInterval(fn, interval);
	};

	shim.clearTimeout = (id) => {
		return PoorManIntervals.clearTimeout(id);
	};

	shim.clearInterval = (id) => {
		return PoorManIntervals.clearInterval(id);
	};
};

export default shimInitShared;