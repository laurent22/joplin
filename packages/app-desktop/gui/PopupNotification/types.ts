import * as React from 'react';

export type PopupHandle = {
	remove(): void;
	scheduleDismiss(delay?: number): void;
};

export enum NotificationType {
	Info = 'info',
	Success = 'success',
	Error = 'error',
}

export type NotificationContentCallback = ()=> React.ReactNode;

export interface PopupOptions {
	type?: NotificationType;
}

export interface ToastOptions {
	delay?: number;
	type?: NotificationType;
	persistent?: boolean;
}

export interface PopupControl {
	createPopup(content: NotificationContentCallback, props?: PopupOptions): PopupHandle;
}
