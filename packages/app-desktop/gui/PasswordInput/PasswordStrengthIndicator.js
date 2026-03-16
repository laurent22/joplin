"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const locale_1 = require("@joplin/lib/locale");
const PasswordStrengthIndicator = (props) => {
    const { password } = props;
    // A very basic heuristic for demonstrating the UI component.
    // TODO: this will be replaced/extended with zxcvbn integration.
    const calculateStrength = (passwd) => {
        if (!passwd)
            return -1;
        let score = 0;
        if (passwd.length >= 8)
            score += 1;
        if (passwd.match(/[a-z]/) && passwd.match(/[A-Z]/))
            score += 1;
        if (passwd.match(/[0-9]/))
            score += 1;
        if (passwd.match(/[^a-zA-Z0-9]/))
            score += 1;
        // Map score from 0-4 to a 0-3 range for UI classes
        return Math.min(Math.max(score - 1, 0), 3);
    };
    const strength = calculateStrength(password);
    if (strength === -1) {
        return null; // Don't show if password is empty
    }
    const getStrengthLabel = (str) => {
        switch (str) {
            case 0: return (0, locale_1._)('Weak');
            case 1: return (0, locale_1._)('Fair');
            case 2: return (0, locale_1._)('Good');
            case 3: return (0, locale_1._)('Strong');
            default: return '';
        }
    };
    return (React.createElement("div", { className: "password-strength-indicator" },
        React.createElement("div", { className: "strength-meter" },
            React.createElement("div", { className: `strength-bar strength-${strength}` })),
        React.createElement("span", { className: "strength-label" }, getStrengthLabel(strength))));
};
exports.default = PasswordStrengthIndicator;
//# sourceMappingURL=PasswordStrengthIndicator.js.map