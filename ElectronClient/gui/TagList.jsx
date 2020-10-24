const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('lib/theme');
const TagItem = require('./TagItem.min.js');

class TagListComponent extends React.Component {
	render() {
		const style = Object.assign({}, this.props.style);
		const theme = themeStyle(this.props.theme);
		const tags = this.props.items;

		style.display = 'flex';
		style.flexDirection = 'row';
		// style.borderBottom = `1px solid ${theme.dividerColor}`;
		style.boxSizing = 'border-box';
		style.fontSize = theme.fontSize;
		style.whiteSpace = 'nowrap';
		style.height = 25;

		const tagItems = [];
		if (tags && tags.length > 0) {
			// Sort by id for now, but probably needs to be changed in the future.
			tags.sort((a, b) => {
				return a.title < b.title ? -1 : +1;
			});

			for (let i = 0; i < tags.length; i++) {
				const props = {
					title: tags[i].title,
					key: tags[i].id,
				};
				tagItems.push(<TagItem {...props} />);
			}
		}

		return (
			<div className="tag-list" style={style}>
				{tagItems}
			</div>
		);
	}
}

const mapStateToProps = state => {
	return { theme: state.settings.theme };
};

const TagList = connect(mapStateToProps)(TagListComponent);

module.exports = TagList;
