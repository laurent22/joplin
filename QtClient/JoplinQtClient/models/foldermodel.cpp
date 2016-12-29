#include "foldermodel.h"

using namespace jop;

FolderModel::FolderModel(Database &database) : QAbstractListModel(), folderCollection_(database, 0, "title") {
	connect(&folderCollection_, SIGNAL(changed(int,int,const QStringList&)), this, SLOT(folderCollection_changed(int,int,const QStringList&)));
}

int FolderModel::rowCount(const QModelIndex & parent) const {
	Q_UNUSED(parent);
	return folderCollection_.count();
}

// NOTE: to lazy load - send back "Loading..." if item not currently loaded
// queue the item for loading.
// Then batch load them a bit later.
QVariant FolderModel::data(const QModelIndex & index, int role) const {
	Folder folder = folderCollection_.at(index.row());

	if (role == Qt::DisplayRole) {
		return QVariant(folder.title());
	}

	if (role == IdRole) {
		return QVariant(folder.id());
	}

	return QVariant();
}

bool FolderModel::setData(const QModelIndex &index, const QVariant &value, int role) {
	Folder folder = folderCollection_.at(index.row());

	if (role == Qt::EditRole) {
		QStringList fields;
		fields << "title";
		VariantVector values;
		values << value;
		folderCollection_.update(folder.id(), fields, values);
		return true;
	}

	qWarning() << "Unsupported role" << role;
	return false;
}

bool FolderModel::setData(int index, const QVariant &value, int role) {
	return setData(this->index(index), value, role);
}

QHash<int, QByteArray> FolderModel::roleNames() const {
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
	roles[TitleRole] = "title";
	roles[IdRole] = "uuid";
	roles[RawRole] = "raw";
	return roles;
}

void FolderModel::folderCollection_changed(int from, int to, const QStringList& fields) {
	QVector<int> roles;
	roles << Qt::DisplayRole;
	emit dataChanged(this->index(from), this->index(to), roles);
}
