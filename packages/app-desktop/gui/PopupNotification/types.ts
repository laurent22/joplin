import { ToastType } from '@joplin/lib/shim';
import * as React from 'react';

export type PopupHandle = {
	remove(): void;
	scheduleDismiss(delay?: number): void;
};

export type NotificationContentCallback = ()=> React.ReactNode;

// NotificationType is an alias for ToastType
export type NotificationType = ToastType;
// eslint-disable-next-line no-redeclare -- export const is necessary for creating an alias, this is not a redeclaration.
export const NotificationType = ToastType;

export interface PopupOptions {
	type?: NotificationType;
}

export interface PopupControl {
	createPopup(content: NotificationContentCallback, props?: PopupOptions): PopupHandle;
}
