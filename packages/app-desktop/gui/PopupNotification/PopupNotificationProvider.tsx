import * as React from 'react';
import { createContext, useMemo, useRef, useState } from 'react';
import { NotificationType, PopupHandle, PopupControl as PopupManager } from './types';
import { Hour, msleep } from '@joplin/utils/time';

export const PopupNotificationContext = createContext<PopupManager|null>(null);
export const VisibleNotificationsContext = createContext<PopupSpec[]>([]);

interface Props {
	children: React.ReactNode;
}

interface PopupSpec {
	key: string;
	dismissAt?: number;
	dismissed: boolean;
	type: NotificationType;
	content: ()=> React.ReactNode;
}

const PopupNotificationProvider: React.FC<Props> = props => {
	const [popupSpecs, setPopupSpecs] = useState<PopupSpec[]>([]);
	const nextPopupKey = useRef(0);

	const popupManager = useMemo((): PopupManager => {
		const removeOldPopups = () => {
			// The WCAG allows dismissing notifications older than 20 hours.
			setPopupSpecs(popups => popups.filter(popup => {
				if (!popup.dismissed) {
					return true;
				}

				const dismissedRecently = popup.dismissAt > performance.now() - Hour * 20;
				return dismissedRecently;
			}));
		};

		const removePopupWithKey = (key: string) => {
			setPopupSpecs(popups => popups.filter(p => p.key !== key));
		};

		type UpdatePopupCallback = (popup: PopupSpec)=> PopupSpec;
		const updatePopupWithKey = (key: string, updateCallback: UpdatePopupCallback) => {
			setPopupSpecs(popups => popups.map(p => {
				if (p.key === key) {
					return updateCallback(p);
				} else {
					return p;
				}
			}));
		};

		const dismissAnimationDelay = 600;
		const dismissPopup = async (key: string) => {
			// Start the dismiss animation
			updatePopupWithKey(key, popup => ({
				...popup,
				dismissAt: performance.now() + dismissAnimationDelay,
			}));

			await msleep(dismissAnimationDelay);

			updatePopupWithKey(key, popup => ({
				...popup,
				dismissed: true,
			}));
			removeOldPopups();
		};

		const dismissAndRemovePopup = async (key: string) => {
			await dismissPopup(key);
			removePopupWithKey(key);
		};

		const manager: PopupManager = {
			createPopup: (content, { type } = {}): PopupHandle => {
				const key = `popup-${nextPopupKey.current++}`;
				const newPopup: PopupSpec = {
					key,
					content,
					type,
					dismissed: false,
				};

				setPopupSpecs(popups => {
					const newPopups = [...popups];

					// Replace the existing popup, if it exists
					const insertIndex = newPopups.findIndex(p => p.key === key);
					if (insertIndex === -1) {
						newPopups.push(newPopup);
					} else {
						newPopups.splice(insertIndex, 1, newPopup);
					}

					return newPopups;
				});

				const handle: PopupHandle = {
					remove() {
						void dismissAndRemovePopup(key);
					},
					scheduleDismiss(delay = 5_500) {
						setTimeout(() => {
							void dismissPopup(key);
						}, delay);
					},
				};
				return handle;
			},
		};
		return manager;
	}, []);

	return <PopupNotificationContext.Provider value={popupManager}>
		<VisibleNotificationsContext.Provider value={popupSpecs}>
			{props.children}
		</VisibleNotificationsContext.Provider>
	</PopupNotificationContext.Provider>;
};

export default PopupNotificationProvider;
