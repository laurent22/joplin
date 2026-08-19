import mit from '../licenseText/mit';
import equalIgnoringSpacing from './equalIgnoringSpacing';

const matchMit = (licenseText: string) => {
	licenseText = licenseText.trim();

	// Match headers similar to "MIT License" and "(The MIT License)"
	const headerRegex = /^.?(?:This software is released under )?(?:The )?(?:MIT License)?(?: .MIT.)?.?[\r\n \t]+/i;
	licenseText = licenseText.replace(headerRegex, '');

	const baseMitLicense = mit('[[copyright here]]').trim().replace(headerRegex, '');

	const copyrightRegex = /^(Copyright .*[\n]){1,}[\n]?(All rights reserved.[\n])?/i;
	const baseLicenseWithoutCopyright = baseMitLicense.replace(copyrightRegex, '');
	const testLicenseTextWithoutCopyright = licenseText.replace(copyrightRegex, '');
	const copyrightMatch = copyrightRegex.exec(licenseText);

	if (copyrightMatch && equalIgnoringSpacing(baseLicenseWithoutCopyright, testLicenseTextWithoutCopyright)) {
		return {
			copyright: copyrightMatch.slice(1).join('\n').trim(),
		};
	} else {
		return null;
	}
};

export default matchMit;
