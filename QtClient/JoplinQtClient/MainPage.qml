import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0

Item {

	property Item appRoot
	property alias currentFolderIndex: folderList.currentIndex
	property alias currentNoteIndex: noteList.currentIndex

	function onShown() {}

	RowLayout {
		id: layout
		anchors.fill: parent
		spacing: 0

		ItemList {
			id: folderList
			model: folderListModel
			Layout.fillWidth: true
			Layout.fillHeight: true
			Layout.minimumWidth: 50
			Layout.preferredWidth: 100
			Layout.maximumWidth: 200
			Layout.minimumHeight: 150

			onCurrentItemChanged: {
				appRoot.currentFolderChanged()
			}

			onEditingAccepted: function(index, text) {
				if (folderList.model.virtualItemShown()) {
					folderList.model.hideVirtualItem();
					folderList.model.addData(text)
					folderList.selectItemById(folderList.model.lastInsertId());
				} else {
					folderList.model.setData(index, text)
				}
			}

			onStoppedEditing: {
				if (folderList.model.virtualItemShown()) {
					folderList.model.hideVirtualItem();
				}
			}

			onDeleteButtonClicked: {
				folderList.model.deleteData(index)
			}
		}

		NoteList {
			id: noteList
			model: noteListModel
			Layout.fillWidth: true
			Layout.fillHeight: true
			Layout.minimumWidth: 100
			Layout.maximumWidth: 200
			Layout.preferredWidth: 200
			Layout.preferredHeight: 100

			onCurrentItemChanged: {
				appRoot.currentNoteChanged()
			}
		}

		NoteEditor {
			id: noteEditor
			model: noteModel
			Layout.fillWidth: true
			Layout.fillHeight: true
			Layout.minimumWidth: 100
			Layout.preferredHeight: 100
		}

	}

	AddButton {
		id: addButton
		anchors.right: parent.right
		anchors.bottom: parent.bottom
		onAddFolderButtonClicked: {
			folderList.model.showVirtualItem();
			folderList.startEditing(folderList.model.rowCount() - 1);
		}
		onAddNoteButtonClicked: appRoot.addNoteButtonClicked()
	}

	Button {
		id: syncButton
		text: "Sync"
		anchors.right: parent.right
		anchors.top: parent.top
		onClicked: appRoot.syncButtonClicked()
	}

	Button {
		id: logoutButton
		text: "Logout"
		anchors.right: syncButton.left
		anchors.top: parent.top
		onClicked: appRoot.logoutClicked()
	}

}
