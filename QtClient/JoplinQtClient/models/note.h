#ifndef NOTE_H
#define NOTE_H

#include <stable.h>
#include "models/item.h"

namespace jop {

class Note : public Item {

public:

	Note();
	//Table table() const;
	bool primaryKeyIsUuid() const;
	bool trackChanges() const;

};

}

#endif // NOTE_H
