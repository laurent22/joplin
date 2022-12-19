const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');
const CommandService = require('@joplin/lib/services/CommandService').default;

class TagItemComponent extends React.Component {
	render() {
		const theme = themeStyle(this.props.themeId);
		const style = Object.assign({}, theme.tagStyle);
		const { title, id } = this.props;

		return <button style={style} onClick={() => CommandService.instance().execute('openTag', id)}>{title}</button>;
	}
}

const mapStateToProps = state => {
	return { themeId: state.settings.theme };
};

const TagItem = connect(mapStateToProps)(TagItemComponent);

module.exports = TagItem;
