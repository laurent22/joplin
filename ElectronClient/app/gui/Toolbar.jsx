const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const ToolbarButton = require('./ToolbarButton.min.js');
const ToolbarLabel = require('./ToolbarLabel.min.js');

class ToolbarComponent extends React.Component {

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		style.height = theme.toolbarHeight;
		style.display = 'flex';
		style.flexDirection  = 'row';
		style.borderBottom = '1px solid ' + theme.dividerColor;
		style.boxSizing = 'border-box';

		const itemComps = [];

		if (this.props.items) {
			for (let i = 0; i < this.props.items.length; i++) {
				const o = this.props.items[i];
				let key = o.iconName ? o.iconName : '';
				key += o.title ? o.title : '';
				const itemType = !('type' in o) ? 'button' : o.type;

				const props = Object.assign({
					key: key,
					theme: this.props.theme,
				}, o);

				if (itemType === 'button') {
					itemComps.push(<ToolbarButton
						{...props}
					/>);
				} else if (itemType === 'text') {
					itemComps.push(<ToolbarLabel
						{...props}
					/>);
				}
			}
		}

		return (
			<div className="editor-toolbar" style={style}>
				{ itemComps }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return { theme: state.settings.theme };
};

const Toolbar = connect(mapStateToProps)(ToolbarComponent);

module.exports = Toolbar;