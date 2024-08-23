import { LicenseOverride } from './licenseOverrides/types';
import licenseChecker = require('license-checker-rseidelsohn');

export interface LicenseInfo {
	licenses: string;
	repository: string|null;
	path: string|undefined;
	licenseText?: string;
	licenseFile?: string;
}

export enum DependencyType {
	Development = 'Development',
	Production = 'Production',
}

const toLicensesMap = (info: licenseChecker.ModuleInfos, overrides: LicenseOverride[]): Record<string, LicenseInfo> => {
	const updatedInfo: Record<string, LicenseInfo> = Object.create(null);

	// Apply overrides

	for (const packageName in info) {
		let isReplaced = false;
		for (const override of overrides) {
			if (override.replacePackagesMatching && override.replacePackagesMatching.exec(packageName)) {
				isReplaced = true;
				break;
			}
		}

		if (!isReplaced) {
			const packageInfo = info[packageName];
			let licenses = 'UNKNOWN';
			if (Array.isArray(packageInfo.licenses)) {
				licenses = packageInfo.licenses.join('AND');
			} else if (packageInfo.licenses) {
				licenses = packageInfo.licenses;
			}

			updatedInfo[packageName] = {
				licenses,
				repository: packageInfo.repository ?? packageInfo.url ?? null,
				path: packageInfo.path,
				licenseFile: packageInfo.licenseFile,
			};
		}
	}

	for (const override of overrides) {
		if (override.info) {
			updatedInfo[override.packageName] = override.info;
		}
	}

	return updatedInfo;
};

const getLicenses = async (
	directory: string,
	mode: DependencyType,
	excludeLicenses: string[],
	overrides: LicenseOverride[] = [],
) => {

	const runCommand = () => {
		return new Promise<licenseChecker.ModuleInfos>((resolve, reject) => {
			const isDevelopmentMode = mode === DependencyType.Development;

			licenseChecker.init({
				start: directory,
				excludeLicenses: excludeLicenses.join(','),
				excludePackagesStartingWith: '@joplin/',
				development: isDevelopmentMode,
				production: !isDevelopmentMode,
			}, (error, info) => {
				if (!error) {
					resolve(info);
				} else {
					reject(error);
				}
			});
		});
	};

	const info = await runCommand();
	overrides = overrides.filter(override => override.mode === mode);
	return toLicensesMap(info, overrides);
};

export default getLicenses;
