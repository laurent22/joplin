"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const shim_1 = require("@joplin/lib/shim");
const bridge_1 = require("../../../services/bridge");
const StyledLink_1 = require("../../style/StyledLink");
const openMissingPasswordFAQ = () => (0, bridge_1.default)().openExternal('https://joplinapp.org/help/faq#why-did-my-sync-and-encryption-passwords-disappear-after-updating-joplin');
// A link to a specific part of the FAQ related to passwords being cleared when upgrading
// to a MacOS/ARM release.
const MacOSMissingPasswordHelpLink = props => {
    const macInfoLink = (React.createElement(StyledLink_1.default, { href: "#", onClick: openMissingPasswordFAQ, style: props.theme.urlStyle }, props.text));
    // The FAQ section related to missing passwords is specific to MacOS/ARM -- only show it
    // in that case.
    const newArchitectureReleasedRecently = Date.now() <= Date.UTC(2023, 11); // 11 = December
    const showMacInfoLink = shim_1.default.isMac() && process.arch === 'arm64' && newArchitectureReleasedRecently;
    return showMacInfoLink ? macInfoLink : null;
};
exports.default = MacOSMissingPasswordHelpLink;
//# sourceMappingURL=MissingPasswordHelpLink.js.map