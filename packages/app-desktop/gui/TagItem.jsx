const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');

class TagItemComponent extends React.Component {
	render() {
		const theme = themeStyle(this.props.themeId);
		const style = Object.assign({}, theme.tagStyle);
		const title = this.props.title;

		return <span style={style}>{title}</span>;
	}
}

const mapStateToProps = state => {
	return { themeId: state.settings.theme };
};

const TagItem = connect(mapStateToProps)(TagItemComponent);

module.exports = TagItem;
