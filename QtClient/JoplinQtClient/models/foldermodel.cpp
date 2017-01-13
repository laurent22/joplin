#include "foldermodel.h"
#include "uuid.h"
#include "dispatcher.h"

using namespace jop;

FolderModel::FolderModel() : AbstractListModel(), orderBy_("title") {
	// Qt::QueuedConnection needs to be used here because in the dispatcher_XXX slots
	// the object that is being worked on might get deleted via cacheClear(). For example:
	// 1. setData() requests a model from the cache
	// 2. it updates it and call model->save()
	// 3. save() emits "folderUpdated"
	// 4. in dispatcher_folderUpdated() (which, without QueuedConnection is called immediately) the cache is cleared, including the model
	// 5. the model is now an invalid pointer and the rest of the code in save() crashes
	// This is solved using QueuedConnection, as it means the cache will be cleared only once model is no longer in use.

	connect(&dispatcher(), SIGNAL(folderCreated(QString)), this, SLOT(dispatcher_folderCreated(QString)), Qt::QueuedConnection);
	connect(&dispatcher(), SIGNAL(folderUpdated(QString)), this, SLOT(dispatcher_folderUpdated(QString)), Qt::QueuedConnection);
	connect(&dispatcher(), SIGNAL(folderDeleted(QString)), this, SLOT(dispatcher_folderDeleted(QString)), Qt::QueuedConnection);
	connect(&dispatcher(), SIGNAL(allFoldersDeleted()), this, SLOT(dispatcher_allFoldersDeleted()), Qt::QueuedConnection);
}

BaseModel* FolderModel::atIndex(int index) const {
	if (cache_.size()) {
		if (index < 0 || index >= cache_.size()) {
			qWarning() << "Invalid folder index:" << index;
			return NULL;
		}

		return cacheGet(index);
	}

	cacheClear();

	cache_ = Folder::all(orderBy_);

	if (!cache_.size()) {
		qWarning() << "Invalid folder index:" << index;
		return NULL;
	} else {
		return atIndex(index);
	}
}

int FolderModel::idToIndex(const QString &id) const {
	int count = this->rowCount();
	for (int i = 0; i < count; i++) {
		Folder* folder = (Folder*)atIndex(i);
		if (folder->idString() == id) return i;
	}
	return -1;
}

//bool FolderModel::setTitle(int index, const QVariant &value, int role) {
//	return setData(this->index(index), value, role);
//}

//bool FolderModel::setData(int index, const QVariant &value, int role) {
//	return BaseModel::setData(this->index(index), value, role);
//}

void FolderModel::addData(const QString &title) {
	Folder folder;
	folder.setValue("title", title);
	if (!folder.save()) return;

	lastInsertId_ = folder.id().toString();
}

void FolderModel::deleteData(const int index) {
	Folder* folder = (Folder*)atIndex(index);
	if (!folder) return;
	folder->dispose();
}

int FolderModel::baseModelCount() const {
	return Folder::count();
}

BaseModel *FolderModel::cacheGet(int index) const {
	return cache_[index].get();
}

void FolderModel::cacheSet(int index, BaseModel* baseModel) const {
	Folder* folder = static_cast<Folder*>(baseModel);
	cache_[index] = std::unique_ptr<Folder>(folder);
}

bool FolderModel::cacheIsset(int index) const {
	return index > 0 && cache_.size() > index;
}

void FolderModel::cacheClear() const {
	cache_.clear();
}

// TODO: instead of clearing the whole cache every time, the individual items
// could be created/updated/deleted

void FolderModel::dispatcher_folderCreated(const QString &folderId) {
	qDebug() << "FolderModel Folder created" << folderId;

	cacheClear();

	int from = 0;
	int to = rowCount() - 1;

	QVector<int> roles;
	roles << Qt::DisplayRole;

	// Necessary to make sure a new item is added to the view, even
	// though it might not be positioned there due to sorting
	beginInsertRows(QModelIndex(), to, to);
	endInsertRows();

	emit dataChanged(this->index(from), this->index(to), roles);
}

void FolderModel::dispatcher_folderUpdated(const QString &folderId) {
	qDebug() << "FolderModel Folder udpated" << folderId;

	cacheClear();

	QVector<int> roles;
	roles << Qt::DisplayRole;
	emit dataChanged(this->index(0), this->index(rowCount() - 1), roles);
}

void FolderModel::dispatcher_folderDeleted(const QString &folderId) {
	qDebug() << "FolderModel Folder deleted" << folderId;

	int index = idToIndex(folderId);
	if (index < 0) return;

	cacheClear();

	beginRemoveRows(QModelIndex(), index, index);
	endRemoveRows();
}

void FolderModel::dispatcher_allFoldersDeleted() {
	qDebug() << "FolderModel All folders deleted";
	cacheClear();
	beginResetModel();
	endResetModel();
}
