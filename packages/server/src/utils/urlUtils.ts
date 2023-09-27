import { URL } from 'url';
import config from '../config';
import { Uuid } from '../services/database/types';

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

export function loginUrl(): string {
	return `${config().baseUrl}/login`;
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
