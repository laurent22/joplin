import { Linking, Platform } from 'react-native';
import injectedJs from './injectedJs';
import PoorManIntervals from '@joplin/lib/PoorManIntervals';
import showMessageBox from '../showMessageBox';
import { Buffer } from 'buffer';
import { basename, fileExtension } from '@joplin/utils/path';
import uuid from '@joplin/lib/uuid';
import * as mimeUtils from '@joplin/lib/mime-utils';
import Resource from '@joplin/lib/models/Resource';
import { getLocales } from 'react-native-localize';
import type Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { closestSupportedLocale, defaultLocale, setLocale } from '@joplin/lib/locale';

const shimInitShared = () => {
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

	// NOTE: This is a limited version of createResourceFromPath - unlike the Node version, it
	// only really works with images. It does not resize the image either.
	shim.createResourceFromPath = async function(filePath, defaultProps = undefined) {
		defaultProps = defaultProps ? defaultProps : {};
		const resourceId = defaultProps.id ? defaultProps.id : uuid.create();

		const ext = fileExtension(filePath);
		let mimeType = mimeUtils.fromFileExtension(ext);
		if (!mimeType) mimeType = 'image/jpeg';

		let resource = Resource.new();
		resource.id = resourceId;
		resource.mime = mimeType;
		resource.title = basename(filePath);
		resource.file_extension = ext;

		const targetPath = Resource.fullPath(resource);
		await shim.fsDriver().copy(filePath, targetPath);

		if (defaultProps) {
			resource = { ...resource, ...defaultProps };
		}

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat.size;

		resource = await Resource.save(resource, { isNew: true });

		return resource;
	};

	shim.detectAndSetLocale = (settings: typeof Setting) => {
		// [
		// 	{
		// 		"countryCode": "US",
		// 		"isRTL": false,
		// 		"languageCode": "fr",
		// 		"languageTag": "fr-US"
		// 	},
		// 	{
		// 		"countryCode": "US",
		// 		"isRTL": false,
		// 		"languageCode": "en",
		// 		"languageTag": "en-US"
		// 	}
		// ]

		const locales = getLocales();
		let locale = locales.length ? locales[0].languageTag : defaultLocale();
		locale = closestSupportedLocale(locale);
		settings.setValue('locale', locale);
		setLocale(locale);
		return locale;
	};
};

export default shimInitShared;
