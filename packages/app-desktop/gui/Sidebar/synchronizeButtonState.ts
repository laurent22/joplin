// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The generated report does not currently have a type
const syncCompletedWithoutError = (syncReport: any) => {
	return syncReport.completedTime && (!syncReport.errors || !syncReport.errors.length);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The generated report does not currently have a type
const syncReportHasErrors = (syncReport: any) => {
	return !!(syncReport.errors && syncReport.errors.length);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The generated report does not currently have a type
const synchronizeButtonState = (type: string, syncPending: boolean, syncReport: any) => {
	const nothingToSync = type === 'sync' && !syncPending && syncCompletedWithoutError(syncReport);
	const hasErrors = type === 'sync' && syncReportHasErrors(syncReport);

	let iconName = 'icon-sync';
	if (nothingToSync) iconName = 'fas fa-check';
	if (hasErrors) iconName = 'fas fa-exclamation-triangle';

	const classNames = ['sidebar-sync-button'];
	if (type !== 'sync') classNames.push('-syncing');
	if (nothingToSync) classNames.push('-synced');
	if (hasErrors) classNames.push('-error');

	return {
		className: classNames.join(' '),
		iconName,
		nothingToSync,
	};
};

export default synchronizeButtonState;
