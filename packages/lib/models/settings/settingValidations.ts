import { _ } from '../../locale';
import shim from '../../shim';
import BaseItem from '../BaseItem';
import Resource from '../Resource';
import Setting from '../Setting';

// Should return an error message if there's a problem, and an empty string if not.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type ValidationHandler = (oldValue: any, newValue: any)=> Promise<string>;

const validations: Record<string, ValidationHandler> = {

	'sync.target': async (oldValue: number, newValue: number) => {
		if (oldValue === 0 || newValue === 0) return '';

		const preventChangeMessage = async () => {
			const needToBeFetched = await Resource.needToBeFetched('always', 1);
			if (needToBeFetched.length) return _('Some attachments need to be downloaded. Set the attachment download mode to "always" and try again.');

			const downloadErrorCount = await Resource.downloadStatusCounts(Resource.FETCH_STATUS_ERROR);
			if (downloadErrorCount > 0) return _('Some attachments could not be downloaded. Please try to download them again.');

			const disabledCount = await BaseItem.syncDisabledItemsCount(Setting.value('sync.target'));
			if (disabledCount > 0) return _('Some items could not be synchronised. Please try to synchronise them first.');

			return '';
		};

		const message = await preventChangeMessage();
		if (message) {
			const resolutionMessage = shim.isReactNative() ?
				_('Uninstall and reinstall the application. Make sure you create a backup first by exporting all your notes as JEX from the desktop application.') :
				_('Close the application, then delete your profile in "%s", and start the application again. Make sure you create a backup first by exporting all your notes as JEX.', Setting.value('profileDir'));

			return _('The sync target cannot be changed for the following reason: %s\n\nIf the issue cannot be resolved, you may need to clear your data first by following these instructions:\n\n%s', message, resolutionMessage);
		}

		return '';
	},

};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const validateSetting = async (settingName: string, oldValue: any, newValue: any) => {
	if (oldValue === newValue) return '';
	if (!validations[settingName]) return '';

	return await validations[settingName](oldValue, newValue);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default async (settingKeys: string[], newValues: Record<string, any>) => {
	for (const key of settingKeys) {
		const oldValue = Setting.value(key);
		const newValue = newValues[key];
		const message = await validateSetting(key, oldValue, newValue);
		return message;
	}
	return '';
};
