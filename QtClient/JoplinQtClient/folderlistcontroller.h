#ifndef ITEMLISTCONTROLLER_H
#define ITEMLISTCONTROLLER_H

#include <stable.h>

#include "models/folder.h"
#include "baseitemlistcontroller.h"

namespace jop {

class FolderListController : public BaseItemListController {

	Q_OBJECT

public:

	FolderListController();

protected:

	void updateItemCount();
	const BaseModel* cacheGet(int index) const;
	void cacheSet(int index, BaseModel* baseModel) const;
	bool cacheIsset(int index) const;
	void cacheClear() const;

private:

	mutable std::vector<std::unique_ptr<Folder>> cache_;

public slots:

	void itemList_rowsRequested(int fromIndex, int toIndex);

};

}

#endif // ITEMLISTCONTROLLER_H
