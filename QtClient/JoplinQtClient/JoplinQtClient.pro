QT += qml quick sql quickcontrols2 network

CONFIG += c++11

SOURCES += \
    main.cpp \
    models/item.cpp \
    models/folder.cpp \
    database.cpp \
    uuid.cpp \
    services/folderservice.cpp \
    models/foldermodel.cpp \
    models/notemodel.cpp \
    models/note.cpp \
    services/noteservice.cpp \
    application.cpp \
    models/notecollection.cpp \
    services/notecache.cpp \
    models/qmlnote.cpp \
    webapi.cpp \
    synchronizer.cpp \
    settings.cpp \
    models/foldercollection.cpp \
    databaseutils.cpp

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
    uuid.h \
    services/folderservice.h \
    models/foldermodel.h \
    models/notemodel.h \
    models/note.h \
    services/noteservice.h \
    application.h \
    models/notecollection.h \
    services/notecache.h \
    sparsevector.hpp \
    models/qmlnote.h \
    webapi.h \
    synchronizer.h \
    settings.h \
    models/foldercollection.h \
    databaseutils.h \
    simpletypes.h

DISTFILES +=

PRECOMPILED_HEADER = stable.h

# INCLUDEPATH += "C:/Program Files (x86)/Windows Kits/10/Include/10.0.10240.0/ucrt"

# LIBS += -L"C:/Program Files (x86)/Windows Kits/10/Lib/10.0.10240.0/ucrt/x86"
