#ifndef NOTEMODEL_H
#define NOTEMODEL_H

#include <stable.h>

#include "models/folder.h"
#include "sparsevector.hpp"
#include "models/abstractlistmodel.h"

namespace jop {

class NoteModel : public AbstractListModel {

	Q_OBJECT

public:

	NoteModel();
	Note* atIndex(int index) const;
	void setFolderId(const QString& v);
	Folder folder() const;

public slots:

	int idToIndex(const QString& id) const;

protected:

	int baseModelCount() const;
	BaseModel* cacheGet(int index) const;
	void cacheSet(int index, BaseModel *baseModel) const;
	bool cacheIsset(int index) const;
	void cacheClear() const;

private:

	QList<Note> notes_;
	QString folderId_;
	QString orderBy_;
	mutable SparseVector<Note> cache_;

};

}

#endif // NOTEMODEL_H
