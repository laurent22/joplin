#include "baseitemlistcontroller.h"

namespace jop {

BaseItemListController::BaseItemListController() :
    parentId_(QString("")),
    itemList_(NULL),
    orderBy_("title") {
}

void BaseItemListController::setItemList(QObject *itemList) {
	if (itemList_) {
		qFatal("Cannot reset itemList - create a new ItemListController instead");
		return;
	}

	itemList_ = itemList;

	connect(itemList, SIGNAL(rowsRequested(int,int)), this, SLOT(itemList_rowsRequested(int,int)));
}

void BaseItemListController::setParentId(const QString &parentId) {
	parentId_= parentId;
	updateItemCount();
}

QString BaseItemListController::parentId() const {
	return parentId_;
}

QObject *BaseItemListController::itemList() const {
	return itemList_;
}

void BaseItemListController::setOrderBy(const QString &v) {
	orderBy_ = v;
}

QString BaseItemListController::orderBy() const {
	return orderBy_;
}

void BaseItemListController::updateItemCount() {
	qFatal("BaseItemListController::updateItemCount() must be implemented by child class");
}

void BaseItemListController::itemList_rowsRequested(int fromIndex, int toIndex) {
	qFatal("BaseItemListController::itemList_rowsRequested() must be implemented by child class");
}

const BaseModel *BaseItemListController::cacheGet(int index) const {
	qFatal("BaseItemListController::cacheGet() not implemented");
	return NULL;
}

void BaseItemListController::cacheSet(int index, BaseModel* baseModel) const {
	qFatal("BaseItemListController::cacheSet() not implemented");
}

bool BaseItemListController::cacheIsset(int index) const {
	qFatal("BaseItemListController::cacheIsset() not implemented");
	return false;
}

void BaseItemListController::cacheClear() const {
	qFatal("BaseItemListController::cacheClear() not implemented");
}

}
