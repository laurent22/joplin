import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Controls 1.4
import QtQuick.Layouts 1.0

Item {
	id: root
	width: 800
	height: 600
	signal currentFolderChanged()
	property alias currentFolderIndex: folderList.currentIndex

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
			Layout.maximumWidth: 300
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
			Layout.preferredWidth: 200
			Layout.preferredHeight: 100
		}

	}

}
