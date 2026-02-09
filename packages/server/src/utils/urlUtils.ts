import { URL } from 'url';
import config from '../config';
import { Uuid } from '../services/database/types';
import { isHttpOrHttpsUrl } from '@joplin/utils/url';
import { ReportType } from '../services/reports/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function setQueryParameters(url: string, query: any): string {
	if (!query) return url;

	const u = new URL(url);

	for (const k of Object.keys(query)) {
		u.searchParams.set(k, query[k]);
	}

	return u.toString();
}

export function stripOffQueryParameters(url: string): string {
	const s = url.split('?');
	if (s.length <= 1) return url;

	s.pop();
	return s.join('?');
}

// Does not escape HTML characters.
export const sanitizeUserUrl = (url: string) => {
	if (!isHttpOrHttpsUrl(url)) {
		return '#';
	}
	return url;
};

export function resetPasswordUrl(token: string): string {
	return `${config().baseUrl}/password/reset${token ? `?token=${token}` : ''}`;
}

export function forgotPasswordUrl(): string {
	return `${config().baseUrl}/password/forgot`;
}

export function profileUrl(): string {
	return `${config().baseUrl}/users/me`;
}

export function helpUrl(): string {
	return `${config().baseUrl}/help`;
}

export function confirmUrl(userId: Uuid, validationToken: string, autoConfirmEmail = true): string {
	return `${config().baseUrl}/users/${userId}/confirm?token=${validationToken}${autoConfirmEmail ? '' : '&confirm_email=0'}`;
}

export function stripePortalUrl(): string {
	return `${config().baseUrl}/stripe/portal`;
}

export function homeUrl(): string {
	return `${config().baseUrl}/home`;
}

export function itemsUrl(): string {
	return `${config().baseUrl}/items`;
}

export function changesUrl(): string {
	return `${config().baseUrl}/changes`;
}

export function loginUrl(applicationAuthId?: string): string {
	const url = `${config().baseUrl}/login`;
	if (!applicationAuthId) return url;
	return `${url}?application_auth_id=${applicationAuthId}`;
}

export function adminUserDeletionsUrl(): string {
	return `${config().adminBaseUrl}/user_deletions`;
}

export function userUrl(userId: Uuid): string {
	return `${config().baseUrl}/users/${userId}`;
}

export function adminDashboardUrl(): string {
	return `${config().adminBaseUrl}/dashboard`;
}

export function adminUsersUrl() {
	return `${config().adminBaseUrl}/users`;
}

export function adminUserUrl(userId: string) {
	return `${config().adminBaseUrl}/users/${userId}`;
}

export function adminTasksUrl() {
	return `${config().adminBaseUrl}/tasks`;
}

export function adminEmailsUrl() {
	return `${config().adminBaseUrl}/emails`;
}

export function adminEmailUrl(id: number) {
	return `${config().adminBaseUrl}/emails/${id}`;
}

export function mfaUrl(userId: Uuid) {
	return `${config().baseUrl}/mfa/${userId}`;
}

export function applicationsConfirmUrl(applicationAuthId: string) {
	return `${config().baseUrl}/applications/${applicationAuthId}/confirm`;
}

export function recoveryCodesUrl() {
	return `${config().baseUrl}/recovery_codes`;
}

export function recoveryCodesAuthUrl(isPassword?: boolean, isMfaCode?: boolean) {
	const url = `${config().baseUrl}/recovery_codes/auth`;
	if (isMfaCode) return `${url}?show_mfa_code=1`;
	if (isPassword) return `${url}?show_password=1`;
	return url;
}

export function applicationsUrl() {
	return `${config().baseUrl}/applications`;
}

export function applicationDeleteUrl(id: string) {
	return `${config().baseUrl}/applications/${id}/delete`;
}

export function adminReportUrl(type: ReportType) {
	return `${config().adminBaseUrl}/reports/${type}`;
}
