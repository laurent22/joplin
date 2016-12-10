import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	property alias model: listView.model
	property alias currentIndex: listView.currentIndex
	signal currentItemChanged()

	Rectangle {
		color: "#eeeeff"
		border.color: "#ff0000"
		anchors.fill: parent
	}

	Component {
		id: folderDelegate
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
		delegate: folderDelegate
		ScrollBar.vertical: ScrollBar {  }
		highlight: Rectangle { color: "lightsteelblue"; radius: 5 }
		focus: true
		onCurrentItemChanged: {
			root.currentItemChanged()
		}
	}
}
