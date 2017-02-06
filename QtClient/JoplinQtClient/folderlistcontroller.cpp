#include "folderlistcontroller.h"
#include "qmlutils.h"

#include "models/folder.h"

namespace jop {

FolderListController::FolderListController() : BaseItemListController() {}

void FolderListController::updateItemCount() {
	int itemCount = Folder::count(parentId());
	qmlUtils::callQml(itemList(), "setItemCount", QVariantList() << itemCount);
}

const BaseModel *FolderListController::cacheGet(int index) const {
	return cache_[index].get();
}

void FolderListController::cacheSet(int index, BaseModel *baseModel) const {
	Folder* folder = static_cast<Folder*>(baseModel);
	cache_[index] = std::unique_ptr<Folder>(folder);
}

bool FolderListController::cacheIsset(int index) const {
	return index > 0 && cache_.size() > index;
}

void FolderListController::cacheClear() const {
	cache_.clear();
}

void FolderListController::itemList_rowsRequested(int fromIndex, int toIndex) {
	if (!cache_.size()) {
		cache_ = Folder::all(parentId(), orderBy());
	}

	//qDebug() << cache_.size();

	if (fromIndex < 0 || toIndex >= cache_.size() || !cache_.size()) {
		qWarning() << "Invalid folder indexes" << fromIndex << toIndex;
		return;
	}

	QVariantList output;
	for (int i = fromIndex; i <= toIndex; i++) {
		const BaseModel* model = cacheGet(i);
		//qDebug() << model;
		//QVariant v(cacheGet(i));
		QVariant v = QVariant::fromValue((QObject*)model);
		//qDebug() << v;
		output.push_back(v);
	}

	QVariantList args;
	args.push_back(fromIndex);
	args.push_back(output);

	qmlUtils::callQml(itemList(), "setItems", args);
}

}
