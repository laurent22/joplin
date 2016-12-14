#include "qmlnote.h"

using namespace jop;

QmlNote::QmlNote() {}

QString QmlNote::title() const {
	return note_.title();
}

QString QmlNote::body() const {
	return note_.body();
}

void QmlNote::setNote(const Note &note) {
	note_ = note;
	emit changed();
	//emit titleChanged();
	//emit bodyChanged();
}
