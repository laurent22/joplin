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
	signal syncButtonClicked()
	property alias currentFolderIndex: mainPage.currentFolderIndex
	property alias currentNoteIndex: mainPage.currentNoteIndex

	MainPage {
		id: mainPage
		anchors.fill: parent
		appRoot: root
	}

	LoginPage {

	}

}
