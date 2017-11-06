const React = require('react');
const { connect } = require('react-redux');
const { Header } = require('./Header.min.js');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');
const { themeStyle } = require('../theme.js');

class MainScreenComponent extends React.Component {

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = {
			width: style.width,
		};

		const rowHeight = style.height - theme.headerHeight;

		const noteListStyle = {
			width: Math.floor(style.width / 3),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteTextStyle = {
			width: noteListStyle.width,
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const sideBarStyle = {
			width: style.width - (noteTextStyle.width + noteListStyle.width),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		return (
			<div style={style}>
				<Header style={headerStyle} showBackButton={false} />
				<SideBar style={sideBarStyle} />
				<NoteList itemHeight={40} style={noteListStyle} />
				<NoteText style={noteTextStyle} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.theme,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };