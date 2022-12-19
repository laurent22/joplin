import { User } from '../../services/database/types';
import { accountByType } from '../UserModel';

export function getCanShareFolder(user: User): number {
	if (!('account_type' in user) || !('can_share_folder' in user)) throw new Error('Missing account_type or can_share_folder property');
	const account = accountByType(user.account_type);
	return user.can_share_folder !== null ? user.can_share_folder : account.can_share_folder;
}

export function getMaxItemSize(user: User): number {
	if (!('account_type' in user) || !('max_item_size' in user)) throw new Error('Missing account_type or max_item_size property');
	const account = accountByType(user.account_type);
	return user.max_item_size !== null ? user.max_item_size : account.max_item_size;
}

export function getMaxTotalItemSize(user: User): number {
	if (!('account_type' in user) || !('max_total_item_size' in user)) throw new Error('Missing account_type or max_total_item_size property');
	const account = accountByType(user.account_type);
	return user.max_total_item_size !== null ? user.max_total_item_size : account.max_total_item_size;
}

export function totalSizePercent(user: User): number {
	const maxTotalSize = getMaxTotalItemSize(user);
	if (!maxTotalSize) return 0;
	return user.total_item_size / maxTotalSize;
}

export function totalSizeClass(user: User) {
	const d = totalSizePercent(user);
	if (d >= 1) return 'is-danger';
	if (d >= .7) return 'is-warning';
	return '';
}
