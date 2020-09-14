/*
** 2015 February 16
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
*/

#include "sqlite3.h"

#if defined(SQLITE_TEST)
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_RBU)

#include "sqlite3rbu.h"
#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#  ifndef SQLITE_TCLAPI
#    define SQLITE_TCLAPI
#  endif
#endif
#include <assert.h>

/* From main.c */ 
extern const char *sqlite3ErrName(int);
extern int sqlite3TestMakePointerStr(Tcl_Interp*, char*, void*);

void test_rbu_delta(sqlite3_context *pCtx, int nArg, sqlite3_value **apVal){
  Tcl_Interp *interp = (Tcl_Interp*)sqlite3_user_data(pCtx);
  Tcl_Obj *pScript;
  int i;

  pScript = Tcl_NewObj();
  Tcl_IncrRefCount(pScript);
  Tcl_ListObjAppendElement(0, pScript, Tcl_NewStringObj("rbu_delta", -1));
  for(i=0; i<nArg; i++){
    sqlite3_value *pIn = apVal[i];
    const char *z = (const char*)sqlite3_value_text(pIn);
    Tcl_ListObjAppendElement(0, pScript, Tcl_NewStringObj(z, -1));
  }

  if( TCL_OK==Tcl_EvalObjEx(interp, pScript, TCL_GLOBAL_ONLY) ){
    const char *z = Tcl_GetStringResult(interp);
    sqlite3_result_text(pCtx, z, -1, SQLITE_TRANSIENT);
  }else{
    Tcl_BackgroundError(interp);
  }

  Tcl_DecrRefCount(pScript);
}


static int SQLITE_TCLAPI test_sqlite3rbu_cmd(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int ret = TCL_OK;
  sqlite3rbu *pRbu = (sqlite3rbu*)clientData;
  struct RbuCmd {
    const char *zName;
    int nArg;
    const char *zUsage;
  } aCmd[] = {
    {"step", 2, ""},                 /* 0 */
    {"close", 2, ""},                /* 1 */
    {"create_rbu_delta", 2, ""},     /* 2 */
    {"savestate", 2, ""},            /* 3 */
    {"dbMain_eval", 3, "SQL"},       /* 4 */
    {"bp_progress", 2, ""},          /* 5 */
    {"db", 3, "RBU"},                /* 6 */
    {"state", 2, ""},                /* 7 */
    {"progress", 2, ""},             /* 8 */
    {"close_no_error", 2, ""},       /* 9 */
    {"temp_size_limit", 3, "LIMIT"}, /* 10 */
    {"temp_size", 2, ""},            /* 11 */
    {"dbRbu_eval", 3, "SQL"},        /* 12 */
    {0,0,0}
  };
  int iCmd;

  if( objc<2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "METHOD");
    return TCL_ERROR;
  }
  ret = Tcl_GetIndexFromObjStruct(
      interp, objv[1], aCmd, sizeof(aCmd[0]), "method", 0, &iCmd
  );
  if( ret ) return TCL_ERROR;
  if( objc!=aCmd[iCmd].nArg ){
    Tcl_WrongNumArgs(interp, 1, objv, aCmd[iCmd].zUsage);
    return TCL_ERROR;
  }

  switch( iCmd ){
    case 0: /* step */ {
      int rc = sqlite3rbu_step(pRbu);
      Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
      break;
    }

    case 9: /* close_no_error */ 
    case 1: /* close */ {
      char *zErrmsg = 0;
      int rc;
      Tcl_DeleteCommand(interp, Tcl_GetString(objv[0]));
      if( iCmd==1 ){
        rc = sqlite3rbu_close(pRbu, &zErrmsg);
      }else{
        rc = sqlite3rbu_close(pRbu, 0);
      }
      if( rc==SQLITE_OK || rc==SQLITE_DONE ){
        Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
        assert( zErrmsg==0 );
      }else{
        Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
        if( zErrmsg ){
          Tcl_AppendResult(interp, " - ", zErrmsg, 0);
          sqlite3_free(zErrmsg);
        }
        ret = TCL_ERROR;
      }
      break;
    }

    case 2: /* create_rbu_delta */ {
      sqlite3 *db = sqlite3rbu_db(pRbu, 0);
      int rc = sqlite3_create_function(
          db, "rbu_delta", -1, SQLITE_UTF8, (void*)interp, test_rbu_delta, 0, 0
      );
      Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
      ret = (rc==SQLITE_OK ? TCL_OK : TCL_ERROR);
      break;
    }

    case 3: /* savestate */ {
      int rc = sqlite3rbu_savestate(pRbu);
      Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
      ret = (rc==SQLITE_OK ? TCL_OK : TCL_ERROR);
      break;
    }

    case 12: /* dbRbu_eval */ 
    case 4:  /* dbMain_eval */ {
      sqlite3 *db = sqlite3rbu_db(pRbu, (iCmd==12));
      int rc = sqlite3_exec(db, Tcl_GetString(objv[2]), 0, 0, 0);
      if( rc!=SQLITE_OK ){
        Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3_errmsg(db), -1));
        ret = TCL_ERROR;
      }
      break;
    }

    case 5: /* bp_progress */ {
      int one, two;
      Tcl_Obj *pObj;
      sqlite3rbu_bp_progress(pRbu, &one, &two);

      pObj = Tcl_NewObj();
      Tcl_ListObjAppendElement(interp, pObj, Tcl_NewIntObj(one));
      Tcl_ListObjAppendElement(interp, pObj, Tcl_NewIntObj(two));
      Tcl_SetObjResult(interp, pObj);
      break;
    }

    case 6: /* db */ {
      int bArg;
      if( Tcl_GetBooleanFromObj(interp, objv[2], &bArg) ){
        ret = TCL_ERROR;
      }else{
        char zBuf[50];
        sqlite3 *db = sqlite3rbu_db(pRbu, bArg);
        if( sqlite3TestMakePointerStr(interp, zBuf, (void*)db) ){
          ret = TCL_ERROR;
        }else{
          Tcl_SetResult(interp, zBuf, TCL_VOLATILE);
        }
      }
      break;
    }
    case 7: /* state */ {
      const char *aRes[] = { 0, "oal", "move", "checkpoint", "done", "error" };
      int eState = sqlite3rbu_state(pRbu);
      assert( eState>0 && eState<=5 );
      Tcl_SetResult(interp, (char*)aRes[eState], TCL_STATIC);
      break;
    }
    case 8: /* progress */ {
      sqlite3_int64 nStep =  sqlite3rbu_progress(pRbu);
      Tcl_SetObjResult(interp, Tcl_NewWideIntObj(nStep));
      break;
    }
                           
    case 10: /* temp_size_limit */ {
      sqlite3_int64 nLimit;
      if( Tcl_GetWideIntFromObj(interp, objv[2], &nLimit) ){
        ret = TCL_ERROR;
      }else{
        nLimit = sqlite3rbu_temp_size_limit(pRbu, nLimit);
        Tcl_SetObjResult(interp, Tcl_NewWideIntObj(nLimit));
      }
      break;
    }
    case 11: /* temp_size */ {
      sqlite3_int64 sz = sqlite3rbu_temp_size(pRbu);
      Tcl_SetObjResult(interp, Tcl_NewWideIntObj(sz));
      break;
    }

    default: /* seems unlikely */
      assert( !"cannot happen" );
      break;
  }

  return ret;
}

/*
** Tclcmd: sqlite3rbu CMD <target-db> <rbu-db> ?<state-db>?
*/
static int SQLITE_TCLAPI test_sqlite3rbu(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3rbu *pRbu = 0;
  const char *zCmd;
  const char *zTarget;
  const char *zRbu;
  const char *zStateDb = 0;

  if( objc!=4 && objc!=5 ){
    Tcl_WrongNumArgs(interp, 1, objv, "NAME TARGET-DB RBU-DB ?STATE-DB?");
    return TCL_ERROR;
  }
  zCmd = Tcl_GetString(objv[1]);
  zTarget = Tcl_GetString(objv[2]);
  zRbu = Tcl_GetString(objv[3]);
  if( objc==5 ) zStateDb = Tcl_GetString(objv[4]);

  pRbu = sqlite3rbu_open(zTarget, zRbu, zStateDb);
  Tcl_CreateObjCommand(interp, zCmd, test_sqlite3rbu_cmd, (ClientData)pRbu, 0);
  Tcl_SetObjResult(interp, objv[1]);
  return TCL_OK;
}

/*
** Tclcmd: sqlite3rbu_vacuum CMD <target-db> <state-db>
*/
static int SQLITE_TCLAPI test_sqlite3rbu_vacuum(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3rbu *pRbu = 0;
  const char *zCmd;
  const char *zTarget;
  const char *zStateDb = 0;

  if( objc!=3 && objc!=4 ){
    Tcl_WrongNumArgs(interp, 1, objv, "NAME TARGET-DB ?STATE-DB?");
    return TCL_ERROR;
  }
  zCmd = Tcl_GetString(objv[1]);
  zTarget = Tcl_GetString(objv[2]);
  if( objc==4 ) zStateDb = Tcl_GetString(objv[3]);
  if( zStateDb && zStateDb[0]=='\0' ) zStateDb = 0;

  pRbu = sqlite3rbu_vacuum(zTarget, zStateDb);
  Tcl_CreateObjCommand(interp, zCmd, test_sqlite3rbu_cmd, (ClientData)pRbu, 0);
  Tcl_SetObjResult(interp, objv[1]);
  return TCL_OK;
}

/*
** Tclcmd: sqlite3rbu_create_vfs ?-default? NAME PARENT
*/
static int SQLITE_TCLAPI test_sqlite3rbu_create_vfs(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  const char *zName;
  const char *zParent;
  int rc;

  if( objc!=3 && objc!=4 ){
    Tcl_WrongNumArgs(interp, 1, objv, "?-default? NAME PARENT");
    return TCL_ERROR;
  }

  zName = Tcl_GetString(objv[objc-2]);
  zParent = Tcl_GetString(objv[objc-1]);
  if( zParent[0]=='\0' ) zParent = 0;

  rc = sqlite3rbu_create_vfs(zName, zParent);
  if( rc!=SQLITE_OK ){
    Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
    return TCL_ERROR;
  }else if( objc==4 ){
    sqlite3_vfs *pVfs = sqlite3_vfs_find(zName);
    sqlite3_vfs_register(pVfs, 1);
  }

  Tcl_ResetResult(interp);
  return TCL_OK;
}

/*
** Tclcmd: sqlite3rbu_destroy_vfs NAME
*/
static int SQLITE_TCLAPI test_sqlite3rbu_destroy_vfs(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  const char *zName;

  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "NAME");
    return TCL_ERROR;
  }

  zName = Tcl_GetString(objv[1]);
  sqlite3rbu_destroy_vfs(zName);
  return TCL_OK;
}

/*
** Tclcmd: sqlite3rbu_internal_test
*/
static int SQLITE_TCLAPI test_sqlite3rbu_internal_test(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3 *db;

  if( objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "");
    return TCL_ERROR;
  }

  db = sqlite3rbu_db(0, 0);
  if( db!=0 ){
    Tcl_AppendResult(interp, "sqlite3rbu_db(0, 0)!=0", 0);
    return TCL_ERROR;
  }

  return TCL_OK;
}

int SqliteRbu_Init(Tcl_Interp *interp){ 
  static struct {
     char *zName;
     Tcl_ObjCmdProc *xProc;
  } aObjCmd[] = {
    { "sqlite3rbu", test_sqlite3rbu },
    { "sqlite3rbu_vacuum", test_sqlite3rbu_vacuum },
    { "sqlite3rbu_create_vfs", test_sqlite3rbu_create_vfs },
    { "sqlite3rbu_destroy_vfs", test_sqlite3rbu_destroy_vfs },
    { "sqlite3rbu_internal_test", test_sqlite3rbu_internal_test },
  };
  int i;
  for(i=0; i<sizeof(aObjCmd)/sizeof(aObjCmd[0]); i++){
    Tcl_CreateObjCommand(interp, aObjCmd[i].zName, aObjCmd[i].xProc, 0, 0);
  }
  return TCL_OK;
}

#else
#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#endif
int SqliteRbu_Init(Tcl_Interp *interp){ return TCL_OK; }
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_RBU) */
#endif /* defined(SQLITE_TEST) */
