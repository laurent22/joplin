import { DependencyType } from '../getLicenses';
import mitLicense from '../licenseText/mit';
import fontAwesomeOverride from './fontAwesomeOverride';
import fontIsoOverride from './fontIsoOverride';
import materialCommunityIconsOverride from './materialCommunityIconsOverride';
import materialIconsOverride from './materialIconsOverride';
import { LicenseOverride, LicenseOverrides } from './types';

const exclude = (packageRegex: RegExp, mode: DependencyType): LicenseOverride => {
	return {
		replacePackagesMatching: packageRegex,
		info: null,
		packageName: `${packageRegex}`,
		mode,
	};
};

const excludeDevelopment = (packageRegex: RegExp) => exclude(packageRegex, DependencyType.Development);

const mitLicenseOverride = (
	packageName: string,
	packageRepo: `https://${string}`,
	copyright: string,
	replaceMatching: RegExp|null = null,
): LicenseOverride => {
	return {
		packageName: packageName,
		replacePackagesMatching: replaceMatching,
		mode: DependencyType.Production,
		info: {
			licenses: 'MIT',
			repository: packageRepo,
			licenseText: mitLicense(copyright),
			path: null,
		},
	};
};

const allPackageOverrides: LicenseOverride[] = [
	// fb-watchman and bser are both dev dependencies and actually MIT-licensed (when the
	// LICENSE file and code comments in the repository were changed, the package.json's
	// license field was not changed).
	excludeDevelopment(/^fb-watchman/),
	excludeDevelopment(/^bser/),
	mitLicenseOverride(
		'tkwidgets',
		'https://github.com/laurent22/tkwidgets',
		'2017-2018 Laurent Cozic',
		/^tkwidgets[@]?.*$/,
	),
];

const licenseOverrides: LicenseOverrides = {
	// react-native-vector-icons depends on several packages
	// implicitly. We need to include them here.
	//
	// See https://github.com/oblador/react-native-vector-icons#bundled-icon-sets
	'app-mobile': [
		// antIcons: Licensed under the MIT
		mitLicenseOverride(
			'ant icons',
			'https://github.com/ant-design/ant-design/blob/master/LICENSE',
			'2015-present Ant UED, https://xtech.antfin.com/',
		),
		// entypo: License unknown DO NOT USE!!!
		// evilIcons: MIT, unused
		// featherIcons: MIT, unused
		fontAwesomeOverride,
		fontIsoOverride,
		// Foundation icons: UNKNOWN. DO NOT USE!!!
		mitLicenseOverride(
			'ionicon icons',
			'https://github.com/ionic-team/ionicons/blob/main/LICENSE',
			'2015-present Ionic (http://ionic.io/)',
		),
		materialCommunityIconsOverride,
		materialIconsOverride,
		// Octicons: Seems to be MIT, unused
		// Zocial icons: Mostly MIT, one icon under CC BY. Do not use without attributing
		// Simple line icons: MIT, unused

		...allPackageOverrides,
	],
	'app-desktop': [
		...allPackageOverrides,
	],
	'app-cli': [
		...allPackageOverrides,
	],
};

export default licenseOverrides;
