#ifndef CONSTANTS_H
#define CONSTANTS_H

#include <stable.h>

namespace jop {

const QString ORG_NAME = "Cozic";
const QString ORG_DOMAIN = "cozic.net";
const QString APP_NAME = "Joplin";

#ifdef Q_WS_WIN
const QString NEW_LINE = "\r\n";
#else // Q_WS_WIN
const QString NEW_LINE = "\n";
#endif // Q_WS_WIN

#if defined(JOP_FRONT_END_CLI)
const QString FRONT_END = "cli";
#elif defined(JOP_FRONT_END_GUI)
const QString FRONT_END = "gui";
#endif // JOP_FRONT_END_GUI

}

#endif // CONSTANTS_H
