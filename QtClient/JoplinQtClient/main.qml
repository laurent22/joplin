import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Controls 1.4
import QtQuick.Layouts 1.0

Item {
	id: root
	width: 800
	height: 600
	signal currentFolderChanged()
	signal currentNoteChanged()
	signal addNoteButtonClicked()
	signal addFolderButtonClicked()
	property alias currentFolderIndex: folderList.currentIndex
	property alias currentNoteIndex: noteList.currentIndex

	RowLayout {
		id: layout
		anchors.fill: parent
		spacing: 0

		FolderList {
			id: folderList
			model: folderListModel
			Layout.fillWidth: true
			Layout.fillHeight: true
			Layout.minimumWidth: 50
			Layout.preferredWidth: 100
			Layout.maximumWidth: 200
			Layout.minimumHeight: 150

			onCurrentItemChanged: {
				root.currentFolderChanged()
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
				root.currentNoteChanged()
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
		onAddFolderButtonClicked: root.addFolderButtonClicked()
		onAddNoteButtonClicked: root.addNoteButtonClicked()
	}

}
