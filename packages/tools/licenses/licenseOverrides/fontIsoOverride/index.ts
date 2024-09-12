import { DependencyType } from '../../getLicenses';
import { LicenseOverride } from '../types';

const fontIsoOverride: LicenseOverride = {
	packageName: 'fontiso icons',
	replacePackagesMatching: /^fontiso@.*$/,
	mode: DependencyType.Production,
	info: {
		licenses: '(CC-BY-3.0 AND OFL-1.1 AND MIT)',
		repository: 'https://github.com/kenangundogan/fontisto',
		path: __dirname,
	},
};

export default fontIsoOverride;
