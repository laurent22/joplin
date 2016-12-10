import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Controls 1.4
import QtQuick.Layouts 1.0

Item {
	width: 800
	height: 600

	RowLayout {
		id: layout
		anchors.fill: parent
		spacing: 0

		FolderListView {
			id: folderTreeView
			model: folderTreeViewModel
			Layout.fillWidth: true
			Layout.fillHeight: true
			Layout.minimumWidth: 50
			Layout.preferredWidth: 100
			Layout.maximumWidth: 300
			Layout.minimumHeight: 150

			onCurrentItemChanged: {
				console.info(folderTreeView.currentIndex)
			}
		}

//		Rectangle {
//			color: 'teal'
//			Layout.fillWidth: true
//			Layout.minimumWidth: 50
//			Layout.preferredWidth: 100
//			Layout.maximumWidth: 300
//			Layout.minimumHeight: 150
//			Text {
//				anchors.centerIn: parent
//				text: parent.width + 'x' + parent.height
//			}
//		}
		Rectangle {
			color: 'plum'
			Layout.fillWidth: true
			Layout.minimumWidth: 100
			Layout.preferredWidth: 200
			Layout.preferredHeight: 100
			Text {
				anchors.centerIn: parent
				text: parent.width + 'x' + parent.height
			}
		}
	}


//	visible: true
//	width: 640
//	height: 480
//	//title: qsTr("Hello World")

//	RowLayout {

//		anchors.fill: parent

//		FolderTreeView {
//			id: folderTreeView
//			model: folderTreeViewModel
//			width: 200
//			//height: 500
//			//currentIndex: folderTreeViewCurrentIndex
//			anchors.fill: parent
//			onCurrentItemChanged: {
//				console.info(folderTreeView.currentIndex)
//				//folderTreeViewCurrentIndex = folderTreeView.currentIndex
//			}
//		}

//		Rectangle {
//			color: 'plum'
//			Text {
//				anchors.centerIn: parent
//				text: parent.width + 'x' + parent.height
//			}
//		}
//	}

}


//import QtQuick 2.7
//import QtQuick.Controls 2.0
//import QtQuick.Controls 1.4
//import QtQuick.Layouts 1.0

//ApplicationWindow {
//    visible: true
//    width: 640
//    height: 480
//    title: qsTr("Hello World")

//    SwipeView {
//        id: swipeView
//        anchors.fill: parent
//        currentIndex: tabBar.currentIndex

//        Page1 {
//        }

//        Page {
//            Label {
//                text: qsTr("Second page")
//                anchors.centerIn: parent
//            }
//        }
//    }

//    footer: TabBar {
//        id: tabBar
//        currentIndex: swipeView.currentIndex
//        TabButton {
//            text: qsTr("First")
//        }
//        TabButton {
//            text: qsTr("Second")
//        }
//    }
//}
