import { Reducer } from 'react';
import Setting from '../models/Setting';
import { ApplicationPlatform, ApplicationType } from '../types';
import shim from '../shim';
import { _ } from '../locale';
import { reg } from '../registry';

type ActionType = 'LINK_USED' | 'COMPLETED' | 'ERROR';
type Action = {
	type: ActionType;
	payload?: any;
};

type DefaultState = {
	className: 'text' | 'bold';
	message: ()=> string;
	next: ActionType;
	active: ActionType | 'INITIAL';
	errorMessage?: string;
};

export const defaultState: DefaultState = {
	className: 'text',
	message: ()=> _('Waiting for authorisation...'),
	next: 'LINK_USED',
	active: 'INITIAL',
};

export const reducer: Reducer<DefaultState, Action> = (state: DefaultState, action: Action) => {
	switch (action.type) {
	case 'LINK_USED': {
		return {
			className: 'text',
			message: () => _('If you have already authorised, please wait for the application to sync to Joplin Cloud.'),
			next: 'COMPLETED',
			active: 'LINK_USED',
		};
	}
	case 'COMPLETED': {
		return {
			className: 'bold',
			message: () => _('You are logged in into Joplin Cloud, you can leave this screen now.'),
			active: 'COMPLETED',
			next: 'COMPLETED',
		};
	}
	case 'ERROR': {
		return {
			className: 'text',
			message: () => _('You were unable to connect to Joplin Cloud, verify your connection. Error: '),
			active: 'ERROR',
			next: 'COMPLETED',
			errorMessage: action.payload,
		};
	}
	default: {
		return state;
	}
	}
};

export const getApplicationInformation = async () => {
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

export const generateLoginWithUniqueLoginCode = async (loginUrl: string, uniqueloginCode: string) => {
	const applicationInfo = await getApplicationInformation();
	const searchParams = new URLSearchParams();
	searchParams.append('unique_login_code', uniqueloginCode);
	searchParams.append('platform', applicationInfo.platform.toString());
	searchParams.append('type', applicationInfo.type.toString());
	searchParams.append('version', shim.appVersion());

	return `${loginUrl}?${searchParams.toString()}`;
};

export const checkIfLoginWasSuccessful = async (applicationsUrl: string, ulc: string) => {
	const response = await fetch(`${applicationsUrl}?unique_login_code=${ulc}`);

	if (response.ok) {
		const jsonResponse = await response.json();
		Setting.setValue('sync.10.username', jsonResponse.id);
		Setting.setValue('sync.10.password', jsonResponse.password);
		return { success: true };
	}

	const jsonBody = await response.json();
	reg.logger().warn('Server could not retrieve application credential', jsonBody);
	return undefined;
};
