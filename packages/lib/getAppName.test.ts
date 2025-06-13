import getAppName from './getAppName';

describe('getAppName', () => {

	it('should get the app name', () => {
		expect(getAppName(true, true)).toBe('joplindev-desktop');
		expect(getAppName(true, false)).toBe('joplin-desktop');
		expect(getAppName(false, false)).toBe('joplin');
		expect(getAppName(false, true)).toBe('joplindev');
	});

});
