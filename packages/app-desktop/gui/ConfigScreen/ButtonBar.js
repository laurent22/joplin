"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ButtonBar;
const React = require("react");
const Button_1 = require("../Button/Button");
const locale_1 = require("@joplin/lib/locale");
const styled = require('styled-components').default;
const StyledRoot = styled.nav `
	display: flex;
	align-items: center;
	padding: 10px;
	background-color: ${(props) => props.theme.backgroundColor3};
	padding-left: ${(props) => props.theme.configScreenPadding}px;
	border-top-width: 1px;
	border-top-style: solid;
	border-top-color: ${(props) => props.theme.dividerColor};
`;
function ButtonBar(props) {
    function renderOkButton() {
        if (!props.onSaveClick)
            return null;
        return React.createElement(Button_1.default, { style: { marginRight: 10 }, level: Button_1.ButtonLevel.Primary, disabled: !props.hasChanges, onClick: props.onSaveClick, title: (0, locale_1._)('OK') });
    }
    function renderApplyButton() {
        if (!props.onApplyClick)
            return null;
        return React.createElement(Button_1.default, { level: Button_1.ButtonLevel.Primary, disabled: !props.hasChanges, onClick: props.onApplyClick, title: (0, locale_1._)('Apply') });
    }
    return (React.createElement(StyledRoot, { className: 'button-bar' },
        React.createElement(Button_1.default, { onClick: props.onCancelClick, level: Button_1.ButtonLevel.Secondary, iconName: "fa fa-chevron-left", title: props.backButtonTitle ? props.backButtonTitle : (0, locale_1._)('Back') }),
        (props.onApplyClick || props.onSaveClick) && (React.createElement("div", { style: { display: 'flex', flexDirection: 'row', marginLeft: 30 } },
            renderOkButton(),
            renderApplyButton()))));
}
//# sourceMappingURL=ButtonBar.js.map