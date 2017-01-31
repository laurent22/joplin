#ifndef WINDOW_H
#define WINDOW_H

#include <stable.h>

namespace jop {

class Window : public QQuickView {

	Q_OBJECT

public:

	Window();
	void showPage(const QString& pageName);
	QVariant callQml(const QString& name, const QVariantList& args = QVariantList());
	void emitSignal(const QString& name, const QVariantList& args = QVariantList());

};

}

#endif // WINDOW_H
