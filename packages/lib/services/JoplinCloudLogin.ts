import { Reducer } from 'react';
import Setting from '../models/Setting';
import { ApplicationPlatform, ApplicationType } from '../types';
import shim from '../shim';
import { _ } from '../locale';
import { reg } from '../registry';

const loginUrl = `${Setting.value('sync.10.website')}/login`;
const applicationsUrl = `${Setting.value('sync.10.path')}/api/applications`;

type Events = 'LINK_USED' | 'COMPLETED';

type IntitialValues = {
	style: string;
	message: string;
	next: Events;
	active: Events | 'INITIAL';
};

export const intitialValues: IntitialValues = {
	style: 'textStyle',
	message: _('Waiting for authorisation...'),
	next: 'LINK_USED',
	active: 'INITIAL',
};

export const reducer: Reducer<IntitialValues, Events> = (state: IntitialValues, action: Events) => {
	switch (action) {
	case 'LINK_USED': {
		return {
			style: 'textStyle',
			message: _('If you have already authorised, please wait for the application to sync to Joplin Cloud.'),
			next: 'COMPLETED',
			active: 'LINK_USED',
		};
	}
	case 'COMPLETED': {
		return {
			style: 'h2Style',
			message: _('You are logged in into Joplin Cloud, you can leave this screen now.'),
			active: 'COMPLETED',
			next: 'COMPLETED',
		};
	}
	default: {
		return state;
	}
	}
};

const getApplicationInformation = async () => {
	const platformName = await shim.platformName();
	switch (platformName) {
	case 'ios':
		return { type: ApplicationType.Mobile, platform: ApplicationPlatform.Ios };
	case 'android':
		return { type: ApplicationType.Mobile, platform: ApplicationPlatform.Android };
	case 'darwin':
		return { type: ApplicationType.Desktop, platform: ApplicationPlatform.MacOs };
	case 'win32':
		return { type: ApplicationType.Desktop, platform: ApplicationPlatform.Windows };
	case 'linux':
		return { type: ApplicationType.Desktop, platform: ApplicationPlatform.Linux };
	default:
		return { type: ApplicationType.Unknown, platform: ApplicationPlatform.Unknown };
	}
};

export const generateLoginWithUniqueLoginCode = async (uniqueloginCode: string) => {
	const applicationInfo = await getApplicationInformation();
	const searchParams = new URLSearchParams();
	searchParams.append('unique_login_code', uniqueloginCode);
	searchParams.append('platform', applicationInfo.platform.toString());
	searchParams.append('type', applicationInfo.type.toString());

	return `${loginUrl}?${searchParams.toString()}`;
};

export const checkIfLoginWasSuccessful = async (ulc: string) => {
	try {
		const response = await fetch(`${applicationsUrl}?unique_login_code=${ulc}`);
		if (!response) return undefined;

		if (response.status === 200) {
			const jsonResponse = await response?.json();
			if (jsonResponse && (jsonResponse.id && jsonResponse.password)) {
				Setting.setValue('sync.10.username', jsonResponse.id);
				Setting.setValue('sync.10.password', jsonResponse.password);
				await Setting.saveAll();
				return { success: true };
			}
		}

		const jsonBody = await response?.json();

		if (jsonBody && response.status >= 400 && response.status <= 500) {
			reg.logger().warn('Server could not retrieve application credential', jsonBody);
			return undefined;
		}

		reg.logger().error('Server error when trying to get the application credential', jsonBody);
	} catch (error) {
		reg.logger().error('Not able to complete request to api/applications', error);
	}
	return undefined;
};
