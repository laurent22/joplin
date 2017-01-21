#ifndef ABSTRACTLISTMODEL_H
#define ABSTRACTLISTMODEL_H

#include <stable.h>
#include "models/basemodel.h"

namespace jop {

class AbstractListModel : public QAbstractListModel {

	Q_OBJECT

public:

	enum ModelRoles {
		IdRole = Qt::UserRole + 1,
		TitleRole
	};

	AbstractListModel();
	int rowCount(const QModelIndex & parent = QModelIndex()) const;
	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;
	virtual const BaseModel* atIndex(int index) const;
	const BaseModel* atIndex(const QModelIndex &index) const;
	bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole);

protected:

	QString lastInsertId_;

	virtual int baseModelCount() const;

	// All these methods are const because we want to be able to clear the
	// cache or set values from any method including const ones.
	// http://stackoverflow.com/a/4248661/561309
	virtual const BaseModel* cacheGet(int index) const;
	virtual void cacheSet(int index, BaseModel* baseModel) const;
	virtual bool cacheIsset(int index) const;
	virtual void cacheClear() const;

private:

	bool virtualItemShown_;

public slots:

	void showVirtualItem();
	bool virtualItemShown() const;
	void hideVirtualItem();
	QHash<int, QByteArray> roleNames() const;
	int roleNameToId(const QString& name) const;
	QString indexToId(int index) const;
	virtual int idToIndex(const QString& id) const;
	QString lastInsertId() const;
	bool setData(int index, const QVariant &value, const QString& role = "edit");

};

}

#endif // ABSTRACTLISTMODEL_H
