#include "foldermodel.h"
#include "uuid.h"

using namespace jop;

FolderModel::FolderModel(Database &database) : QAbstractListModel(), db_(database), orderBy_("title") {
	virtualItemShown_ = false;
}

int FolderModel::rowCount(const QModelIndex & parent) const {
	Q_UNUSED(parent);
	QSqlQuery q = db_.query("SELECT count(*) as row_count FROM folders");
	q.exec();
	q.next();
	return q.value(0).toInt() + (virtualItemShown_ ? 1 : 0);
}

// NOTE: to lazy load - send back "Loading..." if item not currently loaded
// queue the item for loading.
// Then batch load them a bit later.
QVariant FolderModel::data(const QModelIndex & index, int role) const {
	Folder folder;

	if (virtualItemShown_ && index.row() == rowCount() - 1) {
		folder.setTitle("Untitled");
	} else {
		folder = atIndex(index.row());
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
	Folder folder = atIndex(index.row());

	if (role == Qt::EditRole) {
		emit dataChanging();

		QStringList fields;
		VariantVector values;
		fields << "title" << "synced";
		values << value << QVariant(0);

		QSqlQuery q = db_.buildSqlQuery(Database::Update, "folders", fields, values, "id = \"" + folder.id() + "\"");
		q.exec();
		if (!db_.errorCheck(q)) return false;

		cache_.clear();

		QVector<int> roles;
		roles << Qt::DisplayRole;
		emit dataChanged(this->index(0), this->index(rowCount() - 1), roles);
		return true;
	}

	qWarning() << "Unsupported role" << role;
	return false;
}

Folder FolderModel::atIndex(int index) const {
	if (cache_.size()) {
		if (index < 0 || index >= cache_.size()) {
			qWarning() << "Invalid folder index:" << index;
			return Folder();
		}

		return cache_[index];
	}

	cache_.clear();

	QSqlQuery q = db_.query("SELECT " + Folder::dbFields().join(",") + " FROM folders ORDER BY " + orderBy_);
	q.exec();

	while (q.next()) {
		Folder folder;
		folder.fromSqlQuery(q);
		cache_.push_back(folder);
	}

	if (!cache_.size()) {
		qWarning() << "Invalid folder index:" << index;
		return Folder();
	} else {
		return atIndex(index);
	}
}

Folder FolderModel::atIndex(const QModelIndex &index) const {
	return atIndex(index.row());
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
	int count = this->rowCount();
	for (int i = 0; i < count; i++) {
		Folder folder = atIndex(i);
		if (folder.id() == id) return i;
	}
	return -1;
}

QString FolderModel::lastInsertId() const {
	return lastInsertId_;
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
	QStringList fields;
	VariantVector values;
	QString folderId = uuid::createUuid();
	fields << "id" << "title" << "synced";
	values << folderId << QVariant(title) << QVariant(0);

	QSqlQuery q = db_.buildSqlQuery(Database::Insert, "folders", fields, values);
	q.exec();
	if (!db_.errorCheck(q)) return;

	cache_.clear();

	lastInsertId_ = folderId;

	QVector<int> roles;
	roles << Qt::DisplayRole;

	int from = 0;
	int to = rowCount() - 1;

	// Necessary to make sure a new item is added to the view, even
	// though it might not be positioned there due to sorting
	beginInsertRows(QModelIndex(), to, to);
	endInsertRows();

	emit dataChanged(this->index(from), this->index(to), roles);
}

void FolderModel::deleteData(const int index) {
	QString folderId = idAtIndex(index);

	QSqlQuery q(db_.database());
	q.prepare("DELETE FROM folders WHERE id = :id");
	q.bindValue(":id", folderId);
	q.exec();
	if (!db_.errorCheck(q)) return;

	cache_.clear();

	beginRemoveRows(QModelIndex(), index, index);
	endRemoveRows();

	QVector<int> roles;
	roles << Qt::DisplayRole;
	emit dataChanged(this->index(0), this->index(rowCount() - 1), roles);
}
