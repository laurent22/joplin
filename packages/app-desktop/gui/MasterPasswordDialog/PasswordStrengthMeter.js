"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PasswordStrengthMeter;
const React = require("react");
function PasswordStrengthMeter(props) {
    const { score, label, suggestions, ruleIssues, Iscompromised } = props;
    if (!label)
        return null;
    const getColor = () => {
        switch (score) {
            case 0:
            case 1:
                return '#d9534f';
            case 2:
                return '#f0ad4e';
            case 3:
            case 4:
                return '#5cb85c';
            default:
                return '#ccc';
        }
    };
    return (React.createElement("div", { style: { marginTop: 8 } },
        React.createElement("div", { style: { height: 6, backgroundColor: '#ddd', borderRadius: 4 } },
            React.createElement("div", { style: {
                    width: `${(score + 1) * 20}%`,
                    backgroundColor: getColor(),
                    height: '100%',
                } })),
        React.createElement("div", { style: { fontSize: 12, marginTop: 4 } },
            "Strength: ",
            React.createElement("strong", null, label)),
        Iscompromised && (React.createElement("div", { style: { color: 'red', fontSize: 12 } }, "\u26A0\uFE0F This password is commonly used and unsafe")),
        ruleIssues.length > 0 && (React.createElement("ul", { style: { fontSize: 12, color: 'red', paddingLeft: 16 } }, ruleIssues.map((e, i) => (React.createElement("li", { key: i }, e))))),
        suggestions.length > 0 && (React.createElement("ul", { style: { fontSize: 12, paddingLeft: 16 } }, suggestions.map((s, i) => (React.createElement("li", { key: i }, s)))))));
}
//# sourceMappingURL=PasswordStrengthMeter.js.map