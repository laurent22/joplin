#include "qmlnote.h"

using namespace jop;

QmlNote::QmlNote() {}

QString QmlNote::title() const {
	return note_.value("title").toString();
}

QString QmlNote::body() const {
	return note_.value("body").toString();
}

void QmlNote::setNote(const Note &note) {
	note_ = note;
	emit changed();
}
