"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const SettingDescription = props => {
    return React.createElement("div", { className: `setting-description ${!props.text ? '-empty' : ''}`, id: props.id }, props.text);
};
exports.default = SettingDescription;
//# sourceMappingURL=SettingDescription.js.map