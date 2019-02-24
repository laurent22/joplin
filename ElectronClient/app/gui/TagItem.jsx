const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

class TagItemComponent extends React.Component {
	constructor(props) {
		super(props);

		this.clickAway = this.clickAway.bind(this);
	}

	componentWillMount() {
		this.setState({
			title: this.props.title,
			toDelete: false,
		});
	}

	clickAway(event) {
		if (this.span_ && !this.span_.contains(event.target)) {
			this.setState({
				title: this.props.title,
				toDelete: false,
			});
		}
	}

	componentDidMount() {
		document.addEventListener('mousedown', this.clickAway);
	}

	componentWillUnmount() {
		document.removeEventListener('mousedown', this.clickAway);
	}

	render() {
		const theme = themeStyle(this.props.theme);
		let style = Object.assign({textAlign: 'center'}, theme.tagStyle);

		if (this.state.toDelete) {
			style = Object.assign({}, style, {backgroundColor: theme.removeColor});
		}

		const onClick = (event) => {
			if (this.state.toDelete) {
				this.props.onDelete(this.props.title);
			}
			else if (this.props.onDelete) {
				this.setState({
					title: _("Remove?"),
					toDelete: true,
				});
			}
		}

		return (
			<span
				ref={span => this.span_ = span}
				onClick={onClick}
				style={style}
				value={this.state.title}>
			{this.state.title}
			</span>
		);
	}
}

const mapStateToProps = (state) => {
	return { theme: state.settings.theme };
};

const TagItem = connect(mapStateToProps)(TagItemComponent);

module.exports = TagItem;
