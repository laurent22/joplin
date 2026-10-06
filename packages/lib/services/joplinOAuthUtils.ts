import { Reducer } from 'react';
import Setting from '../models/Setting';
import { ApplicationPlatform, ApplicationType } from '../types';
import shim from '../shim';
import { _ } from '../locale';
import eventManager, { EventName } from '../eventManager';
import { reg } from '../registry';
import Logger from '@joplin/utils/Logger';
import SyncTargetRegistry from '../SyncTargetRegistry';
import { isHttpOrHttpsUrl } from '@joplin/utils/url';
import NavService from './NavService';
import { SettingsMap } from '../components/shared/config/config-shared';
import { substrWithEllipsis } from '../string-utils';

const logger = Logger.create('joplinCloudUtils');

type ActionType = 'LINK_USED' | 'COMPLETED' | 'ERROR';
export type Action = {
	type: ActionType;
	payload?: string;
};

type DefaultState = {
	className: 'text' | 'bold';
	message: ()=> string;
	next: ActionType;
	active: ActionType | 'INITIAL';
	syncTargetName: string;
	errorMessage?: string;
};

export const generateAppId = () => shim.crypto.randomUuid();

export const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');

export const defaultState = (syncTargetName: string): DefaultState => ({
	className: 'text',
	message: ()=> _('Waiting for authorisation...'),
	next: 'LINK_USED',
	active: 'INITIAL',
	syncTargetName,
});

export const reducer: Reducer<DefaultState, Action> = (state: DefaultState, action: Action) => {
	switch (action.type) {
	case 'LINK_USED': {
		return {
			className: 'text',
			message: () => _('If you have already authorised, please wait for the application to sync to %s.', state.syncTargetName),
			next: 'COMPLETED',
			active: 'LINK_USED',
			syncTargetName: state.syncTargetName,
		};
	}
	case 'COMPLETED': {
		return {
			className: 'bold',
			message: () => _('You are logged in to %s. You can leave this screen now.', state.syncTargetName),
			active: 'COMPLETED',
			next: 'COMPLETED',
			syncTargetName: state.syncTargetName,
		};
	}
	case 'ERROR': {
		return {
			className: 'text',
			message: () => _('You were unable to connect to %s. Please check your credentials and try again. Error:', state.syncTargetName),
			active: 'ERROR',
			next: 'COMPLETED',
			errorMessage: action.payload,
			syncTargetName: state.syncTargetName,
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
	case 'web':
		return { type: ApplicationType.Mobile, platform: ApplicationPlatform.Web };
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

export const generateApplicationConfirmUrl = async (confirmUrl: string) => {
	const applicationInfo = await getApplicationInformation();
	const searchParams = new URLSearchParams();
	searchParams.append('platform', applicationInfo.platform.toString());
	searchParams.append('type', applicationInfo.type.toString());
	searchParams.append('version', shim.appVersion());

	return `${confirmUrl}?${searchParams.toString()}`;
};

export type JoplinSyncTargetId = 9 | 10;

export const isJoplinOAuthSyncTarget = (id: number): id is JoplinSyncTargetId => {
	return id === 9 || id === 10;
};
export function assertIsJoplinOAuthSyncTarget(id: number): asserts id is JoplinSyncTargetId {
	if (!isJoplinOAuthSyncTarget(id)) {
		throw new Error('Sync target must be Joplin Server or Joplin Cloud');
	}
};

export const hasValidBaseUrl = (id: JoplinSyncTargetId, settings: SettingsMap|null) => {
	const url = settings ? settings[`sync.${id}.path`] : Setting.value(`sync.${id}.path`);
	return !!url && isValidBaseUrl(url);
};

export const isValidBaseUrl = (url: string) => isHttpOrHttpsUrl(url);

export const saveApplicationAuthId = async (applicationAuthId: string, syncTarget: JoplinSyncTargetId) => {
	Setting.setValue(`sync.${syncTarget}.pendingAuthData`, {
		appId: applicationAuthId,
		// Record the sync target URL to ensure that appId isn't sent to the wrong server if
		// the user changes the path:
		path: Setting.value(`sync.${syncTarget}.path`),
	});
	await Setting.saveAll();
};

// Returns null when no login URL can be determined (e.g.)
export const fetchLoginUrl = async (syncTargetId: number, apiBaseUrl: string) => {
	if (syncTargetId === SyncTargetRegistry.nameToId('joplinCloud')) return Setting.value('sync.10.website');
	if (!isHttpOrHttpsUrl(apiBaseUrl)) throw new Error(_('Invalid server URL. Must start with http:// or https://.'));

	const response = await shim.fetch(`${normalizeBaseUrl(apiBaseUrl)}/api/web_login_base_url`);
	if (response.status === 404) {
		// The web_login_base_url API doesn't exist on older Joplin Server versions
		return null;
	}
	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Failed to determine login URL (error ${response.status}): ${JSON.stringify(substrWithEllipsis(text, 0, 128))}`,
		);
	}

	const json = await response.json();
	const uri: unknown = json.uri;
	if (typeof uri !== 'string') {
		throw new Error('Invalid response. Missing "uri".');
	}
	if (!isHttpOrHttpsUrl(uri)) {
		throw new Error('Invalid response. Login URL is not an HTTP or HTTPS URL.');
	}
	return normalizeBaseUrl(uri);
};

export const failedToDetermineLoginUrlMessage = () => (
	_('Failed to determine login URL: Either the server does not support the new auth system or the server URL is incorrect.')
);

export const openLoginScreen = (syncTargetId: number) => {
	const syncTargetClass = SyncTargetRegistry.classById(syncTargetId);
	return NavService.go(syncTargetClass.authRouteName());
};

export const openSyncSettings = () => {
	if (shim.mobilePlatform()) {
		return NavService.go('Config', { sectionName: 'sync' });
	} else {
		return NavService.go('Config', { props: { defaultSection: 'sync' } });
	}
};

interface CheckIfLoginWasSuccessfulOptions {
	baseUrl: string;
	applicationAuthId: string;
	syncTarget: JoplinSyncTargetId;
}

// We have isWaitingResponse inside the function to avoid any state from lingering
// after an error occurs. E.g.: if the function would throw an error while isWaitingResponse
// was set to true the next time we call the function the value would still be true.
// The closure function prevents that.
export const checkIfLoginWasSuccessful = async ({ baseUrl, applicationAuthId, syncTarget }: CheckIfLoginWasSuccessfulOptions) => {
	if (!isValidBaseUrl(baseUrl)) throw new Error('Invalid base URL');

	let isWaitingResponse = false;
	const performLoginRequest = async () => {
		if (isWaitingResponse) return undefined;
		isWaitingResponse = true;

		const applicationsUrl = `${normalizeBaseUrl(baseUrl)}/api/application_auth/${applicationAuthId}`;
		const response = await shim.fetch(applicationsUrl, {
			headers: {
				'X-JOPLIN-CUSTOM-API-KEY': syncTarget === 10 ? Setting.value('sync.10.apiKey') : '',
			},
		});
		if (response.status === 403) { // Not authorized yet
			isWaitingResponse = false;
			return undefined;
		}

		if (!response.ok) {
			isWaitingResponse = false;
			throw new Error(`Connection check failed (${response.status}): ${await response.text()}`);
		}

		const jsonBody = await response.json();

		if (!response.ok || jsonBody.status !== 'finished') {
			isWaitingResponse = false;
			return undefined;
		}

		Setting.setValue(`sync.${syncTarget}.password`, '');
		Setting.setValue(`sync.${syncTarget}.authorizedForPath`, baseUrl);
		Setting.setValue(`sync.${syncTarget}.password`, jsonBody.password);
		Setting.setValue(`sync.${syncTarget}.username`, jsonBody.id);

		Setting.setValue('sync.target', syncTarget);
		Setting.setValue(`sync.${syncTarget}.pendingAuthData`, null);

		const fileApi = await reg.syncTarget().fileApi();
		await fileApi.driver().api().loadSession();
		eventManager.emit(EventName.SessionEstablished);

		return { success: true };
	};

	return performLoginRequest();
};

// If the app was killed during the OAuth flow (common on Android), the
// pending auth ID is still saved. On startup we check whether the server
// has already confirmed the authorisation and, if so, save the credentials.
export const completePendingAuthentication = async () => {
	const syncTarget = Setting.value('sync.target');
	if (!isJoplinOAuthSyncTarget(syncTarget)) return;

	const pendingAuthData = Setting.value(`sync.${syncTarget}.pendingAuthData`);
	if (!pendingAuthData?.appId || !pendingAuthData?.path) return;
	try {
		const apiPath = Setting.value(`sync.${syncTarget}.path`);
		if (pendingAuthData.path !== apiPath) {
			throw new Error('Server URL changed since last authentication');
		}

		const apiBaseUrl = normalizeBaseUrl(apiPath);
		const result = await checkIfLoginWasSuccessful({
			baseUrl: apiBaseUrl,
			applicationAuthId: pendingAuthData.appId,
			syncTarget,
		});
		if (result && result.success) {
			logger.info('Completed pending Joplin Cloud authentication');
		}
	} catch (error) {
		logger.error('Could not complete pending authentication:', error);
	} finally {
		Setting.setValue(`sync.${syncTarget}.pendingAuthData`, null);
	}
};
