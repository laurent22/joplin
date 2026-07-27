import { buildWindowTitle } from './Navigator';

describe('buildWindowTitle', () => {

	test.each([
		['', true, '', 'Joplin'],
		['', false, '', 'Joplin'],
		['Options', true, '', 'Joplin - Options'],
		['Options', false, '', 'Options'],
		['Options', true, ' (DEV - /tmp/profile)', 'Joplin (DEV - /tmp/profile) - Options'],
		['Options', false, ' (DEV - /tmp/profile)', 'Options (DEV - /tmp/profile)'],
	])('should build the window title for screenTitle=%p showAppNameInWindowTitle=%p devMarker=%p', (screenTitle, showAppNameInWindowTitle, devMarker, expected) => {
		expect(buildWindowTitle(screenTitle, showAppNameInWindowTitle, devMarker)).toBe(expected);
	});

});
