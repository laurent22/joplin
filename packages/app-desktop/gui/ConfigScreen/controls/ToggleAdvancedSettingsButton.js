"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const Button_1 = require("../../Button/Button");
const locale_1 = require("@joplin/lib/locale");
const ToggleAdvancedSettingsButton = props => {
    const iconName = props.advancedSettingsVisible ? 'fa fa-angle-down' : 'fa fa-angle-right';
    return (React.createElement("div", { style: { marginBottom: 10 } },
        React.createElement(Button_1.default, { level: Button_1.ButtonLevel.Secondary, onClick: props.onClick, iconName: iconName, "aria-controls": props['aria-controls'], "aria-expanded": props.advancedSettingsVisible, title: (0, locale_1._)('Show Advanced Settings') })));
};
exports.default = ToggleAdvancedSettingsButton;
//# sourceMappingURL=ToggleAdvancedSettingsButton.js.map