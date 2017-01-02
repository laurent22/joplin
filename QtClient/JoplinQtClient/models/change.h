#ifndef CHANGE_H
#define CHANGE_H

#include <stable.h>

#include "models/basemodel.h"

namespace jop {

class Change : public BaseModel {

public:

	enum Type { Undefined, Create, Update, Delete };

	Change();
	Table table() const;

};

}

#endif // CHANGE_H
