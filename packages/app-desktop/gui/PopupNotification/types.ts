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

export interface PopupControl {
	createPopup(content: NotificationContentCallback, props?: PopupOptions): PopupHandle;
}
