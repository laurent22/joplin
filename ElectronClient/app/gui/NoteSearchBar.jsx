const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

class NoteSearchBarComponent extends React.Component {
	constructor() {
		super();

		this.state = {
			query: '',
		};

		this.searchInput_change = this.searchInput_change.bind(this);
		this.searchInput_keyDown = this.searchInput_keyDown.bind(this);
		this.previousButton_click = this.previousButton_click.bind(this);
		this.nextButton_click = this.nextButton_click.bind(this);
		this.closeButton_click = this.closeButton_click.bind(this);
	}

	style() {
		const theme = themeStyle(this.props.theme);

		let style = {
			root: Object.assign({}, theme.textStyle, {
				backgroundColor: theme.backgroundColor,
				color: theme.colorFaded,
			}),
		};

		return style;
	}

	componentDidMount() {
		this.refs.searchInput.focus();
	}

	buttonIconComponent(iconName, clickHandler, isEnabled) {
		const theme = themeStyle(this.props.theme);

		const searchButton = {
			paddingLeft: 4,
			paddingRight: 4,
			paddingTop: 2,
			paddingBottom: 2,
			textDecoration: 'none',
			marginRight: 5,
		};

		const iconStyle = {
			display: 'flex',
			fontSize: Math.round(theme.fontSize) * 1.2,
			color: theme.color,
			opacity: isEnabled ? 1.0 : theme.disabledOpacity,
		};

		const icon = <i style={iconStyle} className={`fa ${iconName}`}></i>;

		return (
			<a href="#" style={searchButton} onClick={clickHandler}>
				{icon}
			</a>
		);
	}

	searchInput_change(event) {
		const query = event.currentTarget.value;
		this.setState({ query: query });
		this.triggerOnChange(query);
	}

	searchInput_keyDown(event) {
		if (event.keyCode === 13) {
			// ENTER
			event.preventDefault();

			if (!event.shiftKey) {
				if (this.props.onNext) this.props.onNext();
			} else {
				if (this.props.onPrevious) this.props.onPrevious();
			}
		}

		if (event.keyCode === 27) {
			// ESCAPE
			event.preventDefault();

			if (this.props.onClose) this.props.onClose();
		}

		if (event.keyCode === 70) {
			// F key
			if (event.ctrlKey) {
				event.target.select();
			}
		}
	}

	previousButton_click() {
		if (this.props.onPrevious) this.props.onPrevious();
	}

	nextButton_click() {
		if (this.props.onNext) this.props.onNext();
	}

	closeButton_click() {
		if (this.props.onClose) this.props.onClose();
	}

	triggerOnChange(query) {
		if (this.props.onChange) this.props.onChange(query);
	}

	focus() {
		this.refs.searchInput.focus();
	}

	render() {
		const theme = themeStyle(this.props.theme);
		let backgroundColor = theme.backgroundColor;
		let buttonEnabled = true;

		if (this.props.resultCount === 0 && this.props.resultQuery.length >  0) {
			backgroundColor = theme.warningBackgroundColor;
			buttonEnabled = false;
		}

		const closeButton = this.buttonIconComponent('fa-times', this.closeButton_click, true);
		const previousButton = this.buttonIconComponent('fa-chevron-up', this.previousButton_click, buttonEnabled);
		const nextButton = this.buttonIconComponent('fa-chevron-down', this.nextButton_click, buttonEnabled);

		const textStyle = Object.assign({
			fontSize: theme.fontSize,
			fontFamily: theme.fontFamily,
			color: theme.colorFaded,
			backgroundColor: theme.backgroundColor,
		});
		const matchesFoundString = (this.props.resultQuery.length > 0 && this.props.resultCount > 0) ? (
			<div style={textStyle}>
				{`${this.props.selectedIndex + 1} / ${this.props.resultCount}`}
			</div>
		) : null;

		return (
			<div style={this.props.style}>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					{closeButton}
					<input
						placeholder={_('Search...')}
						value={this.state.query}
						onChange={this.searchInput_change}
						onKeyDown={this.searchInput_keyDown}
						ref="searchInput"
						type="text"
						style={{ width: 200, marginRight: 5, backgroundColor: backgroundColor }}
					/>
					{nextButton}
					{previousButton}
					{matchesFoundString}
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const NoteSearchBar = connect(
	mapStateToProps,
	null,
	null,
	{ withRef: true }
)(NoteSearchBarComponent);

module.exports = NoteSearchBar;
