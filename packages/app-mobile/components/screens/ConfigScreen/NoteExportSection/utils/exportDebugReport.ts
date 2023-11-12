import { reg } from '@joplin/lib/registry';
import ReportService from '@joplin/lib/services/ReportService';
import shim from '@joplin/lib/shim';
import time from '@joplin/lib/time';

const exportDebugReport = async () => {
	const service = new ReportService();

	const logItems = await reg.logger().lastEntries(null);
	const logItemRows = [['Date', 'Level', 'Message']];
	for (let i = 0; i < logItems.length; i++) {
		const item = logItems[i];
		logItemRows.push([time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss'), item.level, item.message]);
	}
	const logItemCsv = service.csvCreate(logItemRows);

	const itemListCsv = await service.basicItemList({ format: 'csv' });

	const externalDir = await shim.fsDriver().getExternalDirectoryPath();

	if (!externalDir) {
		return;
	}

	const filePath = `${externalDir}/syncReport-${new Date().getTime()}.txt`;

	const finalText = [logItemCsv, itemListCsv].join('\n================================================================================\n');
	await shim.fsDriver().writeFile(filePath, finalText, 'utf8');
	alert(`Debug report exported to ${filePath}`);
};

export default exportDebugReport;
