#include "itemlist2.h"

ItemList2::ItemList2(QObject *parent)
    : QAbstractItemModel(parent)
{
}

QVariant ItemList2::headerData(int section, Qt::Orientation orientation, int role) const
{
	// FIXME: Implement me!
}

QModelIndex ItemList2::index(int row, int column, const QModelIndex &parent) const
{
	// FIXME: Implement me!
}

QModelIndex ItemList2::parent(const QModelIndex &index) const
{
	// FIXME: Implement me!
}

int ItemList2::rowCount(const QModelIndex &parent) const
{
	if (!parent.isValid())
		return 0;

	// FIXME: Implement me!
}

int ItemList2::columnCount(const QModelIndex &parent) const
{
	if (!parent.isValid())
		return 0;

	// FIXME: Implement me!
}

QVariant ItemList2::data(const QModelIndex &index, int role) const
{
	if (!index.isValid())
		return QVariant();

	// FIXME: Implement me!
	return QVariant();
}
