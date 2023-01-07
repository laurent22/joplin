import AlarmServiceDriverNode from './AlarmServiceDriverNode';
const packageInfo = require('../../app-desktop/packageInfo');

describe('removeLeadingDashesFromTitle', () => {

	const alarmServiceDriverNode = new AlarmServiceDriverNode({ appName: packageInfo.build.appId });

	const testCases = [
		['-Title', 'Title'],
		['-----Title', 'Title'],
		['- Title', ' Title'],
		['---- ---- Title', ' ---- Title'],
		['-', ''],
		['', ''],
		['3-2=1', '3-2=1'],
	];

	test.each(testCases)('%s should equal %s', (input, expected) => {
		expect(alarmServiceDriverNode.removeLeadingDashesFromTitleOnLinux(input))
			.toEqual(expected);
	});
});
