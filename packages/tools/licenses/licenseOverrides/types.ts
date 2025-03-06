import { DependencyType, LicenseInfo } from '../getLicenses';

export interface LicenseOverride {
	packageName: string;

	// If null, no packages will be replaced. Regardless, the package
	// will be added to the list of dependencies.
	replacePackagesMatching: RegExp|null;

	// If null, the package should be excluded
	info: LicenseInfo|null;
	mode: DependencyType;
}

export interface LicenseOverrides {
	[packageName: string]: LicenseOverride[];
}
