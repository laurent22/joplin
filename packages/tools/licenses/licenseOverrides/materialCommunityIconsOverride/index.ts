import { DependencyType } from '../../getLicenses';
import { LicenseOverride } from '../types';

const materialCommunityIconsOverride: LicenseOverride = {
	packageName: 'material community icons',
	replacePackagesMatching: null,
	mode: DependencyType.Production,
	info: {
		licenses: '(Apache-2.0 AND MIT)',
		repository: 'https://pictogrammers.com/docs/general/license/',
		path: __dirname,
	},
};

export default materialCommunityIconsOverride;
