import { setupDatabase } from '../../../testing/test-utils';
import { PackageInfo } from '../../../versionInfo';
import getPluginBugReportInfo from './getPluginBugReportInfo';

const mockPackageInfo: PackageInfo = {
	name: 'Test',
	description: 'Test description',
	version: '1.2.3',
	build: { appId: 'some-id-here' },
};

describe('getPluginBugReportInfo', () => {
	beforeAll(async () => {
		// Required to generate issue report links
		await setupDatabase();
	});

	test('should omit the "report to maintainers" option when missing issue tracker/homepage links', async () => {
		const report = await getPluginBugReportInfo({ name: 'Test', id: 'some.id' }, mockPackageInfo);
		expect(report.every(item => item.key !== 'report-to-maintainers')).toBe(true);
		expect(report.every(item => item !== null)).toBe(true);
	});

	test('report to forum option should include the plugin title', async () => {
		const report = await getPluginBugReportInfo({ name: 'test-plugin-title', id: 'some.id.here' }, mockPackageInfo);
		expect(
			report.some(item => item.url.includes('discourse.joplinapp') && item.url.includes('test-plugin-title')),
		).toBe(true);
	});
});
