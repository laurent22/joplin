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
		TitleRole,
		RawRole
	};

	AbstractListModel();
	int rowCount(const QModelIndex & parent = QModelIndex()) const;
	//QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;
//	BaseModel atIndex(int index) const;
//	BaseModel atIndex(const QModelIndex &index) const;

protected:

	virtual BaseModel baseModel() const;
	virtual int baseModelCount() const;

private:

	bool virtualItemShown_;

public slots:

	void showVirtualItem();
	bool virtualItemShown() const;
	void hideVirtualItem();
	QHash<int, QByteArray> roleNames() const;

};

}

#endif // ABSTRACTLISTMODEL_H
