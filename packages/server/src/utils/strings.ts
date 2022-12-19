import { User } from '../services/database/types';
import { getMaxItemSize, getMaxTotalItemSize, totalSizePercent } from '../models/utils/user';
import { formatBytes } from './bytes';

export function yesOrNo(value: any): string {
	return value ? 'yes' : 'no';
}

export function nothing() {
	return '';
}

export function formatMaxItemSize(user: User): string {
	const size = getMaxItemSize(user);
	return size ? formatBytes(size) : '∞';
}

export function formatMaxTotalSize(user: User): string {
	const size = getMaxTotalItemSize(user);
	return size ? formatBytes(size) : '∞';
}

export function formatTotalSizePercent(user: User): string {
	return `${Math.round(totalSizePercent(user) * 100)}%`;
}

export function formatTotalSize(user: User): string {
	return formatBytes(user.total_item_size);
}
