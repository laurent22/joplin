import { DependencyType } from '../../getLicenses';
import { LicenseOverride } from '../types';

const fontAwesomeOverride: LicenseOverride = {
	packageName: 'fontawesome v5 and 6',
	replacePackagesMatching: /^@fontawesome\/.*@5.*$/,
	mode: DependencyType.Production,
	info: {
		licenses: '(CC-BY-4.0 AND OFL-1.1 AND MIT)',
		repository: 'https://github.com/FortAwesome/Font-Awesome',
		path: __dirname,
	},
};

export default fontAwesomeOverride;
