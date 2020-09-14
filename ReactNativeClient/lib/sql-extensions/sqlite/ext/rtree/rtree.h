/*
** 2008 May 26
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This header file is used by programs that want to link against the
** RTREE library.  All it does is declare the sqlite3RtreeInit() interface.
*/
#include "sqlite3.h"

#ifdef SQLITE_OMIT_VIRTUALTABLE
# undef SQLITE_ENABLE_RTREE
#endif

#ifdef __cplusplus
extern "C" {
#endif  /* __cplusplus */

int sqlite3RtreeInit(sqlite3 *db);

#ifdef __cplusplus
}  /* extern "C" */
#endif  /* __cplusplus */
