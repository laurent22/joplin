import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	property alias model: listView.model
	property alias currentIndex: listView.currentIndex
	property alias currentItem: listView.currentItem

	Rectangle {
		color: "#eeeeff"
		border.color: "#ff0000"
		anchors.fill: parent
	}

	ListView {
		id: listView
		anchors.fill: parent
		delegate: folderDelegate
		ScrollBar.vertical: ScrollBar {  }
		highlight: Rectangle { color: "lightsteelblue"; radius: 5 }
		focus: true
//		onModelChanged: {
////			listView.model.onDataChanged = function() {
////				console.info("testaaaaaaaaaaaaaaaaaaa")
////			}
//			console.info("MODEL CHANGAID")
//		}
	}

	Component {
		id: folderDelegate
		EditableListItem {}
	}
}
