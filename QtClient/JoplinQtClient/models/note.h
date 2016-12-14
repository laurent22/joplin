#ifndef NOTE_H
#define NOTE_H

#include <stable.h>
#include "models/item.h"

namespace jop {

class Note : public Item {

public:

	Note();
	QString body() const;
	void setBody(const QString& v);

private:

	QString body_;

};

}

#endif // NOTE_H
