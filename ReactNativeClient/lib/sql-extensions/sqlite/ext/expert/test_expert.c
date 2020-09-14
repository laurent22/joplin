/*
** 2017 April 07
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

#if defined(SQLITE_TEST)

#include "sqlite3expert.h"
#include <assert.h>
#include <string.h>

#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#  ifndef SQLITE_TCLAPI
#    define SQLITE_TCLAPI
#  endif
#endif

#ifndef SQLITE_OMIT_VIRTUALTABLE

/*
** Extract an sqlite3* db handle from the object passed as the second
** argument. If successful, set *pDb to point to the db handle and return
** TCL_OK. Otherwise, return TCL_ERROR.
*/
static int dbHandleFromObj(Tcl_Interp *interp, Tcl_Obj *pObj, sqlite3 **pDb){
  Tcl_CmdInfo info;
  if( 0==Tcl_GetCommandInfo(interp, Tcl_GetString(pObj), &info) ){
    Tcl_AppendResult(interp, "no such handle: ", Tcl_GetString(pObj), 0);
    return TCL_ERROR;
  }

  *pDb = *(sqlite3 **)info.objClientData;
  return TCL_OK;
}


/*
** Tclcmd:  $expert sql SQL
**          $expert analyze
**          $expert count
**          $expert report STMT EREPORT
**          $expert destroy
*/
static int SQLITE_TCLAPI testExpertCmd(
  void *clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3expert *pExpert = (sqlite3expert*)clientData;
  struct Subcmd {
    const char *zSub;
    int nArg;
    const char *zMsg;
  } aSub[] = {
    { "sql",       1, "TABLE",        }, /* 0 */
    { "analyze",   0, "",             }, /* 1 */
    { "count",     0, "",             }, /* 2 */
    { "report",    2, "STMT EREPORT", }, /* 3 */
    { "destroy",   0, "",             }, /* 4 */
    { 0 }
  };
  int iSub;
  int rc = TCL_OK;
  char *zErr = 0;

  if( objc<2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "SUBCOMMAND ...");
    return TCL_ERROR;
  }
  rc = Tcl_GetIndexFromObjStruct(interp, 
      objv[1], aSub, sizeof(aSub[0]), "sub-command", 0, &iSub
  );
  if( rc!=TCL_OK ) return rc;
  if( objc!=2+aSub[iSub].nArg ){
    Tcl_WrongNumArgs(interp, 2, objv, aSub[iSub].zMsg);
    return TCL_ERROR;
  }

  switch( iSub ){
    case 0: {      /* sql */
      char *zArg = Tcl_GetString(objv[2]);
      rc = sqlite3_expert_sql(pExpert, zArg, &zErr);
      break;
    }

    case 1: {      /* analyze */
      rc = sqlite3_expert_analyze(pExpert, &zErr);
      break;
    }

    case 2: {      /* count */
      int n = sqlite3_expert_count(pExpert);
      Tcl_SetObjResult(interp, Tcl_NewIntObj(n));
      break;
    }

    case 3: {      /* report */
      const char *aEnum[] = {
        "sql", "indexes", "plan", "candidates", 0
      };
      int iEnum;
      int iStmt;
      const char *zReport;

      if( Tcl_GetIntFromObj(interp, objv[2], &iStmt) 
       || Tcl_GetIndexFromObj(interp, objv[3], aEnum, "report", 0, &iEnum)
      ){
        return TCL_ERROR;
      }

      assert( EXPERT_REPORT_SQL==1 );
      assert( EXPERT_REPORT_INDEXES==2 );
      assert( EXPERT_REPORT_PLAN==3 );
      assert( EXPERT_REPORT_CANDIDATES==4 );
      zReport = sqlite3_expert_report(pExpert, iStmt, 1+iEnum);
      Tcl_SetObjResult(interp, Tcl_NewStringObj(zReport, -1));
      break;
    }

    default:       /* destroy */
      assert( iSub==4 );     
      Tcl_DeleteCommand(interp, Tcl_GetString(objv[0]));
      break;
  }

  if( rc!=TCL_OK ){
    if( zErr ){
      Tcl_SetObjResult(interp, Tcl_NewStringObj(zErr, -1));
    }else{
      extern const char *sqlite3ErrName(int);
      Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
    }
  }
  sqlite3_free(zErr);
  return rc;
}

static void SQLITE_TCLAPI testExpertDel(void *clientData){
  sqlite3expert *pExpert = (sqlite3expert*)clientData;
  sqlite3_expert_destroy(pExpert);
}

/*
** sqlite3_expert_new DB
*/
static int SQLITE_TCLAPI test_sqlite3_expert_new(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  static int iCmd = 0;
  sqlite3 *db;
  char *zCmd = 0;
  char *zErr = 0;
  sqlite3expert *pExpert;
  int rc = TCL_OK;

  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "DB");
    return TCL_ERROR;
  }
  if( dbHandleFromObj(interp, objv[1], &db) ){
    return TCL_ERROR;
  }

  zCmd = sqlite3_mprintf("sqlite3expert%d", ++iCmd);
  if( zCmd==0 ){
    Tcl_AppendResult(interp, "out of memory", (char*)0);
    return TCL_ERROR;
  }

  pExpert = sqlite3_expert_new(db, &zErr);
  if( pExpert==0 ){
    Tcl_AppendResult(interp, zErr, (char*)0);
    rc = TCL_ERROR;
  }else{
    void *p = (void*)pExpert;
    Tcl_CreateObjCommand(interp, zCmd, testExpertCmd, p, testExpertDel);
    Tcl_SetObjResult(interp, Tcl_NewStringObj(zCmd, -1));
  }

  sqlite3_free(zCmd);
  sqlite3_free(zErr);
  return rc;
}

#endif  /* ifndef SQLITE_OMIT_VIRTUALTABLE */

int TestExpert_Init(Tcl_Interp *interp){
#ifndef SQLITE_OMIT_VIRTUALTABLE
  struct Cmd {
    const char *zCmd;
    Tcl_ObjCmdProc *xProc;
  } aCmd[] = {
    { "sqlite3_expert_new", test_sqlite3_expert_new },
  };
  int i;

  for(i=0; i<sizeof(aCmd)/sizeof(struct Cmd); i++){
    struct Cmd *p = &aCmd[i];
    Tcl_CreateObjCommand(interp, p->zCmd, p->xProc, 0, 0);
  }
#endif
  return TCL_OK;
}

#endif
