#include "abstractlistmodel.h"

using namespace jop;

AbstractListModel::AbstractListModel() : QAbstractListModel() {
	virtualItemShown_ = false;
}

int AbstractListModel::rowCount(const QModelIndex & parent) const { Q_UNUSED(parent);
	return baseModelCount() + (virtualItemShown() ? 1 : 0);
}

QVariant AbstractListModel::data(const QModelIndex & index, int role) const {
	const BaseModel* model = NULL;

	if (virtualItemShown() && index.row() == rowCount() - 1) {
		if (role == Qt::DisplayRole) return "Untitled";
		return "";
	} else {
		model = atIndex(index.row());
	}

	if (role == Qt::DisplayRole) {
		return model->value("title").toQVariant();
	}

	if (role == IdRole) {
		return model->id().toQVariant();
	}

	return QVariant();
}

const BaseModel *AbstractListModel::atIndex(int index) const {
	Q_UNUSED(index);
	qFatal("AbstractListModel::atIndex() not implemented");
	return NULL;
}

const BaseModel* AbstractListModel::atIndex(const QModelIndex &index) const {
	return atIndex(index.row());
}

bool AbstractListModel::setData(const QModelIndex &index, const QVariant &value, int role) {
	const BaseModel* model = atIndex(index.row());
	if (!model) return false;

	if (role == TitleRole) {
		BaseModel temp;
		temp.clone(*model);
		temp.setValue("title", value.toString());
		if (!temp.save()) return false;
		cacheClear();
		return true;

//		model->setValue("title", value.toString());
//		if (!model->save()) return false;
//		cacheClear();
//		return true;
	}

	qWarning() << "Unsupported role" << role;
	return false;
}

bool AbstractListModel::setData(int index, const QVariant &value, const QString& role) {
	return setData(this->index(index), value, roleNameToId(role));
}

int AbstractListModel::baseModelCount() const {
	qFatal("AbstractListModel::baseModelCount() not implemented");
	return 0;
}

const BaseModel *AbstractListModel::cacheGet(int index) const {
	Q_UNUSED(index);
	qFatal("AbstractListModel::cacheGet() not implemented");
	return NULL;
}

void AbstractListModel::cacheSet(int index, BaseModel* baseModel) const {
	Q_UNUSED(index); Q_UNUSED(baseModel);
	qFatal("AbstractListModel::cacheSet() not implemented");
}

bool AbstractListModel::cacheIsset(int index) const {
	Q_UNUSED(index);
	qFatal("AbstractListModel::cacheIsset() not implemented");
	return false;
}

void AbstractListModel::cacheClear() const {
	qFatal("AbstractListModel::cacheClear() not implemented");
}

void AbstractListModel::showVirtualItem() {
	virtualItemShown_ = true;
	beginInsertRows(QModelIndex(), this->rowCount() - 1, this->rowCount() - 1);
	endInsertRows();
}

void AbstractListModel::hideVirtualItem() {
	beginRemoveRows(QModelIndex(), this->rowCount() - 1, this->rowCount() - 1);
	virtualItemShown_ = false;
	endRemoveRows();
}

bool AbstractListModel::virtualItemShown() const {
	return virtualItemShown_;
}

QHash<int, QByteArray> AbstractListModel::roleNames() const {
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
	roles[TitleRole] = "title";
	roles[IdRole] = "id";
	return roles;
}

int AbstractListModel::roleNameToId(const QString &name) const {
	QHash<int, QByteArray> roles = roleNames();
	for (QHash<int, QByteArray>::const_iterator it = roles.begin(); it != roles.end(); ++it) {
		if (it.value() == name) return it.key();
	}
	qCritical() << "Unknown role" << name;
	return 0;
}

QString AbstractListModel::indexToId(int index) const {
	return data(this->index(index), IdRole).toString();
}

int AbstractListModel::idToIndex(const QString &id) const {
	Q_UNUSED(id);
	qFatal("AbstractListModel::idToIndex() not implemented");
	return -1;
}

QString AbstractListModel::lastInsertId() const {
	return lastInsertId_;
}
