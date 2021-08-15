'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const locale_1 = require('@joplin/lib/locale');
const DialogButtonRow_1 = require('../DialogButtonRow');
const Dialog_1 = require('../Dialog');
const styled_components_1 = require('styled-components');
const DialogTitle_1 = require('../DialogTitle');
const StyledRoot = styled_components_1.default.div `
	min-width: 500px;
`;
function default_1(props) {
	const onButtonRowClick = () => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		});
	};
	function renderContent() {
		return (React.createElement(StyledRoot, null,
			React.createElement(DialogTitle_1.default, { title: locale_1._('Synchronisation Wizard') }),
			React.createElement(DialogButtonRow_1.default, { themeId: props.themeId, onClick: onButtonRowClick, okButtonShow: false, cancelButtonLabel: locale_1._('Close') })));
	}
	return (React.createElement(Dialog_1.default, { renderContent: renderContent }));
}
exports.default = default_1;
// # sourceMappingURL=Dialog.js.map
