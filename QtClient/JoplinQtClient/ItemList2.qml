import QtQuick 2.0

Item {

	id: root
	signal rowsRequested(int fromRowIndex, int toRowIndex)

	property int blabla: 123456;

	property variant items: [];
	property int itemCount: 0;
	property int itemHeight: 0;

	function testing() {
		console.info("WXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
	}

	function setItem(index, itemContent) {
		if (index < 0 || index >= itemCount) {
			console.error("ItemList::setItem: index out of bounds:", index);
			return;
		}

		var item = itemComponent.createObject(scrollArea.contentItem)
		item.title = itemContent.title;
		item.invalidateDisplay();

		if (!itemHeight) {
			item.updateDisplay();
			itemHeight = item.height;
		}

		items[index] = item;

		this.invalidateDisplay();
	}

	function setItems(fromIndex, itemContents) {
		for (var i = 0; i < itemContents.length; i++) {
			setItem(fromIndex + i, itemContents[i]);
		}
	}

	function addItem(title) {
		var item = itemComponent.createObject(scrollArea.contentItem)
		item.title = title;
		item.updateDisplay();

		items.push(item);
		if (!itemHeight) itemHeight = item.height;

		this.invalidateDisplay();
	}

	function setItemCount(count) {
		this.itemCount = count;
		this.invalidateDisplay();
	}

	function invalidateDisplay() {
		updateDisplay();
	}

	function updateDisplay() {
		var itemY = 0;
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (item) {
				item.y = itemY;
			}
			itemY += itemHeight
		}

		scrollArea.contentHeight = itemCount * itemHeight;

		// console.info("itemCount itemHeight", this.itemCount, this.itemHeight);
		// console.info("scrollArea.contentHeight", scrollArea.contentHeight);
	}

	Component {
		id: itemComponent
		Item {

			property alias title: label.text

			function invalidateDisplay() {
				this.updateDisplay();
			}

			function updateDisplay() {
				this.height = label.height
			}

			Text {
				id: label
				anchors.left: parent.left
				anchors.right: parent.right
				verticalAlignment: Text.AlignVCenter
			}
		}
	}

	Flickable {
		id: scrollArea
		anchors.fill: parent
		contentWidth: 800
		contentHeight: 5000

//		Rectangle {
//			id: background
//			color: "#ffffff"
//			border.color: "#0000ff"
//			width: 800
//			height: 500
//		}
	}

}
