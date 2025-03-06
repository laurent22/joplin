import apache2License from '../../licenseText/apache2';
import { DependencyType } from '../../getLicenses';
import { LicenseOverride } from '../types';

const materialCommunityIconsOverride: LicenseOverride = {
	packageName: 'material icons and symbols',
	replacePackagesMatching: null,
	mode: DependencyType.Production,
	info: {
		licenses: 'Apache-2.0',
		repository: 'https://github.com/google/material-design-icons',
		path: __dirname,
		licenseText: apache2License,
	},
};

export default materialCommunityIconsOverride;
