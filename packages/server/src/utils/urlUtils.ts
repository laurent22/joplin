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

export function confirmUrl(userId: Uuid, validationToken: string, autoConfirmEmail: boolean = true): string {
	return `${config().baseUrl}/users/${userId}/confirm?token=${validationToken}${autoConfirmEmail ? '' : '&confirm_email=0'}`;
}

export function stripePortalUrl(): string {
	return `${config().baseUrl}/stripe/portal`;
}

export function homeUrl(): string {
	return `${config().baseUrl}/home`;
}

export function loginUrl(): string {
	return `${config().baseUrl}/login`;
}
