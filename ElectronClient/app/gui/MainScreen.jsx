const React = require('react');
const { connect } = require('react-redux');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');

class MainScreenComponent extends React.Component {

	render() {
		const style = this.props.style;

		const noteListStyle = {
			width: Math.floor(style.width / 3),
			height: style.height,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteTextStyle = {
			width: noteListStyle.width,
			height: style.height,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const sideBarStyle = {
			width: style.width - (noteTextStyle.width + noteListStyle.width),
			height: style.height,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		return (
			<div style={style}>
				<SideBar style={sideBarStyle}></SideBar>
				<NoteList itemHeight={40} style={noteListStyle}></NoteList>
				<NoteText style={noteTextStyle}></NoteText>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };