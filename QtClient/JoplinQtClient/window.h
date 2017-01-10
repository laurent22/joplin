#ifndef WINDOW_H
#define WINDOW_H

#include <stable.h>

namespace jop {

class Window : public QQuickView {

	Q_OBJECT

public:

	Window();
	void showPage(const QString& pageName);

};

}

#endif // WINDOW_H
