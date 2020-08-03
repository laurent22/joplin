const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('lib/theme');
const ToolbarButton = require('./ToolbarButton.min.js');
const ToolbarSpace = require('./ToolbarSpace.min.js');
const ToggleEditorsButton = require('./ToggleEditorsButton/ToggleEditorsButton.js').default;

class ToolbarComponent extends React.Component {
	render() {
		const theme = themeStyle(this.props.theme);

		const style = Object.assign({
			// height: theme.toolbarHeight,
			display: 'flex',
			flexDirection: 'row',
			borderBottom: `1px solid ${theme.dividerColor}`,
			boxSizing: 'border-box',
		}, this.props.style);

		const itemComps = [];

		if (this.props.items) {
			for (let i = 0; i < this.props.items.length; i++) {
				const o = this.props.items[i];
				let key = o.iconName ? o.iconName : '';
				key += o.title ? o.title : '';
				const itemType = !('type' in o) ? 'button' : o.type;

				if (!key) key = `${o.type}_${i}`;

				const props = Object.assign(
					{
						key: key,
						theme: this.props.theme,
					},
					o
				);

				if (this.props.disabled) props.disabled = true;

				if (o.name === 'toggleEditors') {
					itemComps.push(<ToggleEditorsButton
						key={o.name}
						value={'markdown'}
						theme={this.props.theme}
						toolbarButtonInfo={o}
					/>);
				} else if (itemType === 'button') {
					itemComps.push(<ToolbarButton {...props} />);
				} else if (itemType === 'separator') {
					itemComps.push(<ToolbarSpace {...props} />);
				}
			}
		}

		return (
			<div className="editor-toolbar" style={style}>
				{itemComps}
			</div>
		);
	}
}

const mapStateToProps = state => {
	return { theme: state.settings.theme };
};

const Toolbar = connect(mapStateToProps)(ToolbarComponent);

module.exports = Toolbar;
