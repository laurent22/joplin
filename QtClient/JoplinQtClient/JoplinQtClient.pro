# To enable CLI or GUI, add either of these:
# "JOP_FRONT_END_CLI=1"
# "JOP_FRONT_END_GUI=1"
# to the qmake command. So that it looks like this:
# qmake JoplinQtClient.pro -spec linux-g++ CONFIG+=debug CONFIG+=qml_debug "JOP_FRONT_END_CLI=1" && /usr/bin/make qmake_all

QT += qml quick sql quickcontrols2 network

CONFIG += c++11

defined(JOP_FRONT_END_CLI, var) {
    message(Building CLI client)
    DEFINES += "JOP_FRONT_END_CLI=$$JOP_FRONT_END_CLI"
}

defined(JOP_FRONT_END_GUI, var) {
    message(Building GUI client)
    DEFINES += "JOP_FRONT_END_GUI=$$JOP_FRONT_END_GUI"
}

defined(JOP_FRONT_END_CLI, var) {
    QT -= gui
    CONFIG += console
    CONFIG -= app_bundle
}

SOURCES += \
    main.cpp \
    models/item.cpp \
    models/folder.cpp \
    database.cpp \
    models/foldermodel.cpp \
    models/notemodel.cpp \
    models/note.cpp \
    models/qmlnote.cpp \
    webapi.cpp \
    synchronizer.cpp \
    settings.cpp \
    uuid.cpp \
    dispatcher.cpp \
    models/change.cpp \
    models/basemodel.cpp \
    models/setting.cpp \
    paths.cpp \
    window.cpp \
    filters.cpp \
    models/abstractlistmodel.cpp \
    cliapplication.cpp \
    command.cpp \
    qmlutils.cpp \
    baseitemlistcontroller.cpp \
    folderlistcontroller.cpp

RESOURCES += qml.qrc \
    database.qrc

# Additional import path used to resolve QML modules in Qt Creator's code model
QML_IMPORT_PATH =

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target

HEADERS += \
    stable.h \
    models/folder.h \
    models/item.h \
    database.h \
    models/foldermodel.h \
    models/notemodel.h \
    models/note.h \
    sparsevector.hpp \
    models/qmlnote.h \
    webapi.h \
    synchronizer.h \
    settings.h \
    simpletypes.h \
    uuid.h \
    dispatcher.h \
    models/change.h \
    models/basemodel.h \
    enum.h \
    models/setting.h \
    paths.h \
    constants.h \
    window.h \
    filters.h \
    models/abstractlistmodel.h \
    cliapplication.h \
    command.h \
    qmlutils.h \
    baseitemlistcontroller.h \
    folderlistcontroller.h

defined(JOP_FRONT_END_GUI, var) {
    SOURCES += application.cpp
    HEADERS += application.h
}

DISTFILES += \
    AndroidManifest.xml

PRECOMPILED_HEADER = stable.h

# INCLUDEPATH += "C:/Program Files (x86)/Windows Kits/10/Include/10.0.10240.0/ucrt"

# LIBS += -L"C:/Program Files (x86)/Windows Kits/10/Lib/10.0.10240.0/ucrt/x86"
