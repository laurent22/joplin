"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateNotificationEvents = void 0;
const React = require("react");
const react_1 = require("react");
const theme_1 = require("@joplin/lib/theme");
const NotyfContext_1 = require("../NotyfContext");
const electron_1 = require("electron");
const AutoUpdaterService_1 = require("../../services/autoUpdater/AutoUpdaterService");
const locale_1 = require("@joplin/lib/locale");
const html_1 = require("@joplin/utils/html");
var UpdateNotificationEvents;
(function (UpdateNotificationEvents) {
    UpdateNotificationEvents["ApplyUpdate"] = "apply-update";
    UpdateNotificationEvents["Dismiss"] = "dismiss-update-notification";
})(UpdateNotificationEvents || (exports.UpdateNotificationEvents = UpdateNotificationEvents = {}));
const changelogLink = 'https://github.com/laurent22/joplin/releases';
window.openChangelogLink = () => {
    electron_1.ipcRenderer.send('open-link', changelogLink);
};
const UpdateNotification = ({ themeId }) => {
    const notyfContext = (0, react_1.useContext)(NotyfContext_1.default);
    const notificationRef = (0, react_1.useRef)(null); // Use ref to hold the current notification
    const theme = (0, react_1.useMemo)(() => (0, theme_1.themeStyle)(themeId), [themeId]);
    const notyf = (0, react_1.useMemo)(() => {
        const output = notyfContext;
        output.options.types = notyfContext.options.types.map(type => {
            if (type.type === 'success') {
                type.background = theme.backgroundColor5;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                type.icon.color = theme.backgroundColor5;
            }
            return type;
        });
        return output;
    }, [notyfContext, theme]);
    const handleDismissNotification = (0, react_1.useCallback)(() => {
        notyf.dismiss(notificationRef.current);
        notificationRef.current = null;
    }, [notyf]);
    const handleApplyUpdate = (0, react_1.useCallback)(() => {
        electron_1.ipcRenderer.send('apply-update-now');
        handleDismissNotification();
    }, [handleDismissNotification]);
    const handleUpdateDownloaded = (0, react_1.useCallback)((_event, info) => {
        if (notificationRef.current)
            return;
        const updateAvailableHtml = (0, html_1.htmlentities)((0, locale_1._)('A new update (%s) is available', info.version));
        const seeChangelogHtml = (0, html_1.htmlentities)((0, locale_1._)('See changelog'));
        const restartNowHtml = (0, html_1.htmlentities)((0, locale_1._)('Restart now'));
        const updateLaterHtml = (0, html_1.htmlentities)((0, locale_1._)('Update later'));
        const messageHtml = `
		<div class="update-notification" style="color: ${theme.color2};">
			${updateAvailableHtml}  <a href="#" onclick="openChangelogLink()" style="color: ${theme.color2};">${seeChangelogHtml}</a>
			<div style="display: flex; gap: 10px; margin-top: 8px;">
				<button onclick="document.dispatchEvent(new CustomEvent('${UpdateNotificationEvents.ApplyUpdate}'))" class="notyf__button notyf__button--confirm" style="color: ${theme.color2};">${restartNowHtml}</button>
				<button onclick="document.dispatchEvent(new CustomEvent('${UpdateNotificationEvents.Dismiss}'))" class="notyf__button notyf__button--dismiss" style="color: ${theme.color2};">${updateLaterHtml}</button>
			</div>
		</div>
		`;
        const notification = notyf.open({
            type: 'success',
            message: messageHtml,
            position: {
                x: 'right',
                y: 'bottom',
            },
            duration: 0,
        });
        notificationRef.current = notification;
    }, [notyf, theme]);
    (0, react_1.useEffect)(() => {
        electron_1.ipcRenderer.on(AutoUpdaterService_1.AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
        document.addEventListener(UpdateNotificationEvents.ApplyUpdate, handleApplyUpdate);
        document.addEventListener(UpdateNotificationEvents.Dismiss, handleDismissNotification);
        return () => {
            electron_1.ipcRenderer.removeListener(AutoUpdaterService_1.AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
            document.removeEventListener(UpdateNotificationEvents.ApplyUpdate, handleApplyUpdate);
            document.removeEventListener(UpdateNotificationEvents.Dismiss, handleDismissNotification);
        };
    }, [handleApplyUpdate, handleDismissNotification, handleUpdateDownloaded]);
    return (React.createElement("div", { style: { display: 'none' } }));
};
exports.default = UpdateNotification;
//# sourceMappingURL=UpdateNotification.js.map