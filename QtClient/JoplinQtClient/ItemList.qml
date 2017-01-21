import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	property alias model: listView.model
	property alias currentIndex: listView.currentIndex
	property alias currentItem: listView.currentItem
	property string currentItemId

	signal stoppedEditing;
	signal editingAccepted(int index, string text);
	signal deleteButtonClicked(int index);

	function startEditing(index) {
		currentIndex = model.rowCount() - 1;
		currentItem.startEditing();
	}

	function stopEditing() {
		currentItem.stopEditing();
	}

	function selectItemById(id) {
		currentItemId = id
		var newIndex = listView.model.idToIndex(currentItemId);
		currentIndex = newIndex
		if (newIndex < 0) currentItemId = "";
	}

	Rectangle {
		color: "#eeeeff"
		border.color: "#ff0000"
		anchors.fill: parent
	}

	ListView {

		Connections {
			target: model
			onDataChanged: {
				if (currentItemId !== "") {
					print("Connection.onDataChanged");
					selectItemById(currentItemId);
				}
			}
		}

		onCurrentItemChanged: {
			currentItemId = model.indexToId(currentIndex);
		}

		id: listView
		highlightMoveVelocity: -1
		highlightMoveDuration: 100
		anchors.fill: parent
		delegate: itemListDelegate
		ScrollBar.vertical: ScrollBar {  }
		highlight: Rectangle { color: "lightsteelblue"; radius: 5 }
		focus: true
	}

	Component {
		id: itemListDelegate
		EditableListItem {
			contextMenu:
				Menu {
				    MenuItem {
						text: "Delete"
						onTriggered: deleteButtonClicked(currentIndex);
					}
			    }
			onStoppedEditing: {
				root.stoppedEditing();
			}
			onEditingAccepted: function(index, text) {
				root.editingAccepted(index, text);
			}
		}
	}
}
