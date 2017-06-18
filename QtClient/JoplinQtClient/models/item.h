#ifndef ITEM_H
#define ITEM_H

#include <stable.h>

#include "models/basemodel.h"

namespace jop {

class Item : public BaseModel {

	Q_OBJECT

public:

	Item();
	QString serialize() const;
	void patchFriendlyString(const QString& patch);

};

}

#endif // ITEM_H
