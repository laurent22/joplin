#ifndef CHANGE_H
#define CHANGE_H

#include <stable.h>

#include "models/basemodel.h"

namespace jop {

class Change : public BaseModel {

public:

	enum Type { Undefined, Create, Update, Delete };

	Change();
	static std::vector<Change*> all(int limit = 100);
	static void mergedChanges(std::vector<Change*> &changes);
	static void disposeByItemId(const QString& itemId);

	void addMergedField(const QString& name);
	QStringList mergedFields() const;

private:

	QStringList mergedFields_;

};

}

#endif // CHANGE_H
