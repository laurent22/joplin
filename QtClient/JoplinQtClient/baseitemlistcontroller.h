#ifndef BASEITEMLISTCONTROLLER_H
#define BASEITEMLISTCONTROLLER_H

#include <stable.h>
#include "models/basemodel.h"

namespace jop {

class BaseItemListController : public QObject {

	Q_OBJECT

public:

	BaseItemListController();
	void setItemList(QObject* itemList);
	void setParentId(const QString& parentId);
	QString parentId() const;
	QObject* itemList() const;
	void setOrderBy(const QString& v);
	QString orderBy() const;

private:

	QObject* itemList_;
	QString parentId_;
	QString orderBy_;

protected:

	virtual void updateItemCount();

	// All these methods are const because we want to be able to clear the
	// cache or set values from any method including const ones.
	// http://stackoverflow.com/a/4248661/561309
	virtual const BaseModel* cacheGet(int index) const;
	virtual void cacheSet(int index, BaseModel* baseModel) const;
	virtual bool cacheIsset(int index) const;
	virtual void cacheClear() const;

public slots:

	virtual void itemList_rowsRequested(int fromIndex, int toIndex);

};

}

#endif // BASEITEMLISTCONTROLLER_H
