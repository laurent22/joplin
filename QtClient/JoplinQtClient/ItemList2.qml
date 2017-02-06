import QtQuick 2.0

Item {

	id: root
	signal rowsRequested(int fromRowIndex, int toRowIndex)

	property variant items: [];
	property int itemCount_: 0;
	property int itemHeight_: 0;
	property bool needToRequestRows_: false;

	function itemHeight() {
		if (root.itemHeight_) return root.itemHeight_;
		var item = itemComponent.createObject(root)
		item.content = { title: "dummy", id: "" };
		item.updateDisplay();
		item.visible = false;
		root.itemHeight_ = item.height;
		return root.itemHeight_;
	}

	function itemCount() {
		return itemCount_;
	}

	function setItem(index, itemContent) {
		if (index < 0 || index >= itemCount) {
			console.error("ItemList::setItem: index out of bounds:", index);
			return;
		}

		var contentTitle = itemContent.title;

		var item = itemComponent.createObject(scrollArea.contentItem)
		item.content = {
			id: itemContent.id,
			title: itemContent.title
		};
		item.invalidateDisplay();

		items[index] = item;

		root.invalidateDisplay();
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

		root.invalidateDisplay();
	}

	function setItemCount(count) {
		if (count === root.itemCount_) return;
		root.itemCount_ = count;
		root.needToRequestRows_ = true;
		root.invalidateDisplay();
	}

	function invalidateDisplay() {
		root.updateDisplay();
	}

	function updateDisplay() {
		var itemY = 0;
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (item) item.y = itemY;
			itemY += itemHeight()
		}

		scrollArea.contentHeight = itemCount() * itemHeight();

		if (root.needToRequestRows_) {
			root.needToRequestRows_ = false;
			var indexes = itemIndexesInView();
			root.rowsRequested(indexes[0], indexes[1]);
		}
	}

	function itemIndexesInView() {
		var maxVisibleItems = Math.ceil(scrollArea.height / itemHeight());

		var fromIndex = Math.max(0, Math.floor(scrollArea.contentY / itemHeight()));
		var toIndex = fromIndex + maxVisibleItems;
		var maxIndex = itemCount() - 1;

		return [Math.min(fromIndex, maxIndex), Math.min(toIndex, maxIndex)];
	}

	Component {
		id: itemComponent
		Item {
			id: container
			//property alias title: label.text
			property variant content;

			function invalidateDisplay() {
				container.updateDisplay();
			}

			function updateDisplay() {
				label.text = content.title;
				container.height = label.height
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
