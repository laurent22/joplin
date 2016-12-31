#include "foldermodel.h"

using namespace jop;

FolderModel::FolderModel(Database &database) : QAbstractListModel(), folderCollection_(database, 0, "title"), db_(database), orderBy_("title") {
	virtualItemShown_ = false;
	connect(&folderCollection_, SIGNAL(changed(int,int,const QStringList&)), this, SLOT(folderCollection_changed(int,int,const QStringList&)));
}

int FolderModel::rowCount(const QModelIndex & parent) const {
	Q_UNUSED(parent);
	return folderCollection_.count() + (virtualItemShown_ ? 1 : 0);
}

// NOTE: to lazy load - send back "Loading..." if item not currently loaded
// queue the item for loading.
// Then batch load them a bit later.
QVariant FolderModel::data(const QModelIndex & index, int role) const {
	Folder folder;

	if (virtualItemShown_ && index.row() == rowCount() - 1) {
		folder.setTitle("Untitled");
	} else {
		folder = folderCollection_.at(index.row());
	}

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
		emit dataChanging();

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

void FolderModel::showVirtualItem() {
	virtualItemShown_ = true;
	beginInsertRows(QModelIndex(), this->rowCount() - 1, this->rowCount() - 1);
	endInsertRows();
}

void FolderModel::hideVirtualItem() {
	beginRemoveRows(QModelIndex(), this->rowCount() - 1, this->rowCount() - 1);
	virtualItemShown_ = false;
	endRemoveRows();
}

QString FolderModel::idAtIndex(int index) const {
	return data(this->index(index), IdRole).toString();
}

int FolderModel::idToIndex(const QString &id) const {
	return folderCollection_.idToIndex(id);
}

bool FolderModel::virtualItemShown() const {
	return virtualItemShown_;
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

void FolderModel::addData(const QString &title) {
	emit dataChanging();

	QStringList fields;
	fields << "title";
	VariantVector values;
	values << QVariant(title);
	folderCollection_.add(fields, values);
}

void FolderModel::deleteData(const int index) {
	QString id = folderCollection_.indexToId(index);
	folderCollection_.remove(id);
}

void FolderModel::folderCollection_changed(int from, int to, const QStringList& fields) {
	beginRemoveRows(QModelIndex(), from, to);
	QVector<int> roles;
	roles << Qt::DisplayRole;
	qDebug() << "update" << from << to;
	emit dataChanged(this->index(from), this->index(to), roles);
	endRemoveRows();
}
