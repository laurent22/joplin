#include "note.h"

using namespace jop;

Note::Note()
{

}

QString Note::body() const {
	return body_;
}

void Note::setBody(const QString &v) {
	body_ = v;
}
