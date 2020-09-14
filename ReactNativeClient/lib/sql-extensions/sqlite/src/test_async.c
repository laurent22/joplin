/*
** 2005 December 14
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
** This file contains a binding of the asynchronous IO extension interface
** (defined in ext/async/sqlite3async.h) to Tcl.
*/

#define TCL_THREADS 
#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#  ifndef SQLITE_TCLAPI
#    define SQLITE_TCLAPI
#  endif
#endif

#ifdef SQLITE_ENABLE_ASYNCIO

#include "sqlite3async.h"
#include "sqlite3.h"
#include <assert.h>

/* From main.c */
extern const char *sqlite3ErrName(int);


struct TestAsyncGlobal {
  int isInstalled;                     /* True when async VFS is installed */
} testasync_g = { 0 };

TCL_DECLARE_MUTEX(testasync_g_writerMutex);

/*
** sqlite3async_initialize PARENT-VFS ISDEFAULT
*/
static int SQLITE_TCLAPI testAsyncInit(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  const char *zParent;
  int isDefault;
  int rc;

  if( objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "PARENT-VFS ISDEFAULT");
    return TCL_ERROR;
  }
  zParent = Tcl_GetString(objv[1]);
  if( !*zParent ) {
    zParent = 0;
  }
  if( Tcl_GetBooleanFromObj(interp, objv[2], &isDefault) ){
    return TCL_ERROR;
  }

  rc = sqlite3async_initialize(zParent, isDefault);
  if( rc!=SQLITE_OK ){
    Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
    return TCL_ERROR;
  }
  return TCL_OK;
}

/*
** sqlite3async_shutdown
*/
static int SQLITE_TCLAPI testAsyncShutdown(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3async_shutdown();
  return TCL_OK;
}

static Tcl_ThreadCreateType tclWriterThread(ClientData pIsStarted){
  Tcl_MutexLock(&testasync_g_writerMutex);
  *((int *)pIsStarted) = 1;
  sqlite3async_run();
  Tcl_MutexUnlock(&testasync_g_writerMutex);
  Tcl_ExitThread(0);
  TCL_THREAD_CREATE_RETURN;
}

/*
** sqlite3async_start
**
** Start a new writer thread.
*/
static int SQLITE_TCLAPI testAsyncStart(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  volatile int isStarted = 0;
  ClientData threadData = (ClientData)&isStarted;

  Tcl_ThreadId x;
  const int nStack = TCL_THREAD_STACK_DEFAULT;
  const int flags = TCL_THREAD_NOFLAGS;
  int rc;

  rc = Tcl_CreateThread(&x, tclWriterThread, threadData, nStack, flags);
  if( rc!=TCL_OK ){
    Tcl_AppendResult(interp, "Tcl_CreateThread() failed", 0);
    return TCL_ERROR;
  }

  while( isStarted==0 ) { /* Busy loop */ }
  return TCL_OK;
}

/*
** sqlite3async_wait
**
** Wait for the current writer thread to terminate.
**
** If the current writer thread is set to run forever then this
** command would block forever.  To prevent that, an error is returned. 
*/
static int SQLITE_TCLAPI testAsyncWait(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int eCond;
  if( objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "");
    return TCL_ERROR;
  }

  sqlite3async_control(SQLITEASYNC_GET_HALT, &eCond);
  if( eCond==SQLITEASYNC_HALT_NEVER ){
    Tcl_AppendResult(interp, "would block forever", (char*)0);
    return TCL_ERROR;
  }

  Tcl_MutexLock(&testasync_g_writerMutex);
  Tcl_MutexUnlock(&testasync_g_writerMutex);
  return TCL_OK;
}

/*
** sqlite3async_control OPTION ?VALUE?
*/
static int SQLITE_TCLAPI testAsyncControl(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int rc = SQLITE_OK;
  int aeOpt[] = { SQLITEASYNC_HALT, SQLITEASYNC_DELAY, SQLITEASYNC_LOCKFILES };
  const char *azOpt[] = { "halt", "delay", "lockfiles", 0 };
  const char *az[] = { "never", "now", "idle", 0 };
  int iVal;
  int eOpt;

  if( objc!=2 && objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "OPTION ?VALUE?");
    return TCL_ERROR;
  }
  if( Tcl_GetIndexFromObj(interp, objv[1], azOpt, "option", 0, &eOpt) ){
    return TCL_ERROR;
  }
  eOpt = aeOpt[eOpt];

  if( objc==3 ){
    switch( eOpt ){
      case SQLITEASYNC_HALT: {
        assert( SQLITEASYNC_HALT_NEVER==0 );
        assert( SQLITEASYNC_HALT_NOW==1 );
        assert( SQLITEASYNC_HALT_IDLE==2 );
        if( Tcl_GetIndexFromObj(interp, objv[2], az, "value", 0, &iVal) ){
          return TCL_ERROR;
        }
        break;
      }
      case SQLITEASYNC_DELAY:
        if( Tcl_GetIntFromObj(interp, objv[2], &iVal) ){
          return TCL_ERROR;
        }
        break;

      case SQLITEASYNC_LOCKFILES:
        if( Tcl_GetBooleanFromObj(interp, objv[2], &iVal) ){
          return TCL_ERROR;
        }
        break;
    }

    rc = sqlite3async_control(eOpt, iVal);
  }

  if( rc==SQLITE_OK ){
    rc = sqlite3async_control(
        eOpt==SQLITEASYNC_HALT ? SQLITEASYNC_GET_HALT :
        eOpt==SQLITEASYNC_DELAY ? SQLITEASYNC_GET_DELAY :
        SQLITEASYNC_GET_LOCKFILES, &iVal);
  }

  if( rc!=SQLITE_OK ){
    Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
    return TCL_ERROR;
  }

  if( eOpt==SQLITEASYNC_HALT ){
    Tcl_SetObjResult(interp, Tcl_NewStringObj(az[iVal], -1));
  }else{
    Tcl_SetObjResult(interp, Tcl_NewIntObj(iVal));
  }

  return TCL_OK;
}

#endif  /* SQLITE_ENABLE_ASYNCIO */

/*
** This routine registers the custom TCL commands defined in this
** module.  This should be the only procedure visible from outside
** of this module.
*/
int Sqlitetestasync_Init(Tcl_Interp *interp){
#ifdef SQLITE_ENABLE_ASYNCIO
  Tcl_CreateObjCommand(interp,"sqlite3async_start",testAsyncStart,0,0);
  Tcl_CreateObjCommand(interp,"sqlite3async_wait",testAsyncWait,0,0);

  Tcl_CreateObjCommand(interp,"sqlite3async_control",testAsyncControl,0,0);
  Tcl_CreateObjCommand(interp,"sqlite3async_initialize",testAsyncInit,0,0);
  Tcl_CreateObjCommand(interp,"sqlite3async_shutdown",testAsyncShutdown,0,0);
#endif  /* SQLITE_ENABLE_ASYNCIO */
  return TCL_OK;
}
