import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	property alias model: listView.model
	property alias currentIndex: listView.currentIndex
	property alias currentItem: listView.currentItem
	property string currentItemId

	signal startedEditing;
	signal stoppedEditing;
	signal editingAccepted(int index, string text);
	signal deleteButtonClicked(int index);

	// While an item is being edited, this property hold the item ID.
	// It is then used, once the model is updated, to restore the selection.
	property string editedItemId;

	function startEditing(index) {
		root.editedItemId = listView.model.indexToId(index);
		currentIndex = model.rowCount() - 1;
		currentItem.startEditing();
		print("Start editing", root.editedItemId);
	}

	function stopEditing() {
		currentItem.stopEditing();
		print("Stop editing", root.editedItemId);
		//print(root.editedItemId, listView.model.idToIndex(root.editedItemId));
		//currentIndex = listView.model.idToIndex(root.editedItemId);
	}

	function selectItemById(id) {
		print("selectItemBy()", id);
		currentItemId = id
		var newIndex = listView.model.idToIndex(currentItemId);
		print("newIndex", newIndex);
		currentIndex = newIndex
		if (newIndex < 0) currentItemId = "";
		print("currentItemId", currentItemId);
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
				print("Connection.onDataChanged", root.editedItemId);
				if (root.editedItemId !== "") {
					selectItemById(root.editedItemId);
					root.editedItemId = "";
				}
			}
		}

//		onCurrentItemChanged: {
//			print("onCurrentItemChanged avant", currentItemId);
//			currentItemId = model.indexToId(currentIndex);
//			print("onCurrentItemChanged apres", currentItemId);
//		}

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
			onStartedEditing: {
				print("onStartedEditing()");
				root.editedItemId = listView.model.indexToId(index);
				root.startedEditing();
			}
			onStoppedEditing: {
				print("onStoppedEditing()");
				root.stoppedEditing();
			}
			onEditingAccepted: function(index, text) {
				print("onEditingAccepted()");
				root.editingAccepted(index, text);
			}
		}
	}
}
