#include "abstractlistmodel.h"

using namespace jop;

AbstractListModel::AbstractListModel() : QAbstractListModel() {
	virtualItemShown_ = false;
}

int AbstractListModel::rowCount(const QModelIndex & parent) const { Q_UNUSED(parent);
	return baseModelCount() + (virtualItemShown() ? 1 : 0);
}

//QVariant AbstractListModel::data(const QModelIndex & index, int role) const {
//	BaseModel model = baseModel();

//	if (virtualItemShown() && index.row() == rowCount() - 1) {
//		model.setValue("title", BaseModel::Value(QString("Untitled")));
//	} else {
//		model = atIndex(index.row());
//	}

//	if (role == Qt::DisplayRole) {
//		return model.value("title").toQVariant();
//	}

//	if (role == IdRole) {
//		return model.id().toQVariant();
//	}

//	return QVariant();
//}

//BaseModel AbstractListModel::atIndex(int index) const {
//	if (cache_.size()) {
//		if (index < 0 || index >= cache_.size()) {
//			qWarning() << "Invalid folder index:" << index;
//			return Folder();
//		}

//		return cache_[index];
//	}

//	cache_.clear();

//	cache_ = Folder::all(orderBy_);

//	if (!cache_.size()) {
//		qWarning() << "Invalid folder index:" << index;
//		return Folder();
//	} else {
//		return atIndex(index);
//	}
//}

//BaseModel AbstractListModel::atIndex(const QModelIndex &index) const {
//	return atIndex(index.row());
//}

BaseModel AbstractListModel::baseModel() const {
	qFatal("AbstractListModel::baseModel() not implemented");
	return BaseModel();
}

int AbstractListModel::baseModelCount() const {
	qFatal("AbstractListModel::baseModelCount() not implemented");
	return 0;
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
	//roles[RawRole] = "raw";
	return roles;
}
