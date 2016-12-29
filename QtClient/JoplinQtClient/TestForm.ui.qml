import QtQuick 2.4

Item {
	id: item1
	width: 400
	height: 400

	AddButton {
		id: addButton1
		x: 232
		y: 294
		width: 100
		height: 50
		anchors.rightMargin: 0
		anchors.bottom: parent.bottom
		anchors.right: parent.right
	}

 FolderList {
	 id: folderList1
	 width: 107
	 anchors.bottom: parent.bottom
	 anchors.top: parent.top
	 anchors.left: parent.left
 }
}
