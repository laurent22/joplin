import QtQuick.Controls 1.4

TreeView {
	TableViewColumn {
		title: "Name"
		role: "fileName"
		width: 300
	}
	TableViewColumn {
		title: "Permissions"
		role: "filePermissions"
		width: 100
	}
	model: fileSystemModel
}
