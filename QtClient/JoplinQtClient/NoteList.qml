import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	property alias model: listView.model
	property alias currentIndex: listView.currentIndex
	property alias currentItem: listView.currentItem

	Rectangle {
		color: "#ffeeee"
		border.color: "#00ff00"
		anchors.fill: parent
	}

	Component {
		id: noteDelegate
		Item {
			width: parent.width
			height: 25
			Text {
				text: display
			}
			MouseArea {
				anchors.fill: parent
				onClicked: {
					listView.currentIndex = index
				}
			}
		}
	}

	ListView {
		id: listView
		anchors.fill: parent
		delegate: noteDelegate
		highlightMoveVelocity: -1
		highlightMoveDuration: 100
		ScrollBar.vertical: ScrollBar {  }
		highlight: Rectangle { color: "lightsteelblue"; radius: 5 }
		focus: true
		onCurrentItemChanged: {
			root.currentItemChanged()
		}
	}
}
