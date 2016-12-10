#include "foldermodel.h"

using namespace jop;

//FolderModel::FolderModel() : QAbstractListModel() {}

FolderModel::FolderModel(FolderService &folderService) : QAbstractListModel() {
	folderService_ = folderService;
}

void FolderModel::addFolder(Folder* folder) {
	//folders_.push_back(folder);
}

int FolderModel::rowCount(const QModelIndex & parent) const {
	Q_UNUSED(parent);
	return folderService_.count();
	//return 10;
	//return folders_.size();
}

// NOTE: to lazy load - send back "Loading..." if item not currently loaded
// queue the item for loading.
// Then batch load them a bit later.
QVariant FolderModel::data(const QModelIndex & index, int role) const {
	QList<Folder> list = folderService_.overviewList();

	if (index.row() < 0 || index.row() >= list.size()) return QVariant();

	Folder folder = list[index.row()];

	if (role == Qt::DisplayRole) {
		return QVariant(folder.title());
	}

	return QVariant();
}

QHash<int, QByteArray> FolderModel::roleNames() const {
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
	roles[TitleRole] = "title";
	roles[UuidRole] = "uuid";
	return roles;
}

bool FolderModel::canFetchMore(const QModelIndex &parent) const {
	return folders_.size() < folderService_.count();
}

void FolderModel::fetchMore(const QModelIndex &parent) {

}
