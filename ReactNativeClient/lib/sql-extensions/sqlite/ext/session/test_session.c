
#if defined(SQLITE_TEST) && defined(SQLITE_ENABLE_SESSION) \
 && defined(SQLITE_ENABLE_PREUPDATE_HOOK)

#include "sqlite3session.h"
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

#ifndef SQLITE_AMALGAMATION
  typedef unsigned char u8;
#endif

typedef struct TestSession TestSession;
struct TestSession {
  sqlite3_session *pSession;
  Tcl_Interp *interp;
  Tcl_Obj *pFilterScript;
};

typedef struct TestStreamInput TestStreamInput;
struct TestStreamInput {
  int nStream;                    /* Maximum chunk size */
  unsigned char *aData;           /* Pointer to buffer containing data */
  int nData;                      /* Size of buffer aData in bytes */
  int iData;                      /* Bytes of data already read by sessions */
};

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

/*************************************************************************
** The following code is copied byte-for-byte from the sessions module
** documentation.  It is used by some of the sessions modules tests to
** ensure that the example in the documentation does actually work.
*/ 
/*
** Argument zSql points to a buffer containing an SQL script to execute 
** against the database handle passed as the first argument. As well as
** executing the SQL script, this function collects a changeset recording
** all changes made to the "main" database file. Assuming no error occurs,
** output variables (*ppChangeset) and (*pnChangeset) are set to point
** to a buffer containing the changeset and the size of the changeset in
** bytes before returning SQLITE_OK. In this case it is the responsibility
** of the caller to eventually free the changeset blob by passing it to
** the sqlite3_free function.
**
** Or, if an error does occur, return an SQLite error code. The final
** value of (*pChangeset) and (*pnChangeset) are undefined in this case.
*/
int sql_exec_changeset(
  sqlite3 *db,                  /* Database handle */
  const char *zSql,             /* SQL script to execute */
  int *pnChangeset,             /* OUT: Size of changeset blob in bytes */
  void **ppChangeset            /* OUT: Pointer to changeset blob */
){
  sqlite3_session *pSession = 0;
  int rc;

  /* Create a new session object */
  rc = sqlite3session_create(db, "main", &pSession);

  /* Configure the session object to record changes to all tables */
  if( rc==SQLITE_OK ) rc = sqlite3session_attach(pSession, NULL);

  /* Execute the SQL script */
  if( rc==SQLITE_OK ) rc = sqlite3_exec(db, zSql, 0, 0, 0);

  /* Collect the changeset */
  if( rc==SQLITE_OK ){
    rc = sqlite3session_changeset(pSession, pnChangeset, ppChangeset);
  }

  /* Delete the session object */
  sqlite3session_delete(pSession);

  return rc;
}
/************************************************************************/

/*
** Tclcmd: sql_exec_changeset DB SQL
*/
static int SQLITE_TCLAPI test_sql_exec_changeset(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  const char *zSql;
  sqlite3 *db;
  void *pChangeset;
  int nChangeset;
  int rc;

  if( objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "DB SQL");
    return TCL_ERROR;
  }
  if( dbHandleFromObj(interp, objv[1], &db) ) return TCL_ERROR;
  zSql = (const char*)Tcl_GetString(objv[2]);

  rc = sql_exec_changeset(db, zSql, &nChangeset, &pChangeset);
  if( rc!=SQLITE_OK ){
    Tcl_ResetResult(interp);
    Tcl_AppendResult(interp, "error in sql_exec_changeset()", 0);
    return TCL_ERROR;
  }

  Tcl_SetObjResult(interp, Tcl_NewByteArrayObj(pChangeset, nChangeset));
  sqlite3_free(pChangeset);
  return TCL_OK;
}



#define SESSION_STREAM_TCL_VAR "sqlite3session_streams"

/*
** Attempt to find the global variable zVar within interpreter interp
** and extract an integer value from it. Return this value.
**
** If the named variable cannot be found, or if it cannot be interpreted
** as a integer, return 0.
*/
static int test_tcl_integer(Tcl_Interp *interp, const char *zVar){
  Tcl_Obj *pObj;
  int iVal = 0;
  pObj = Tcl_ObjGetVar2(interp, Tcl_NewStringObj(zVar, -1), 0, TCL_GLOBAL_ONLY);
  if( pObj ) Tcl_GetIntFromObj(0, pObj, &iVal);
  return iVal;
}

static int test_session_error(Tcl_Interp *interp, int rc, char *zErr){
  extern const char *sqlite3ErrName(int);
  Tcl_SetObjResult(interp, Tcl_NewStringObj(sqlite3ErrName(rc), -1));
  if( zErr ){
    Tcl_AppendResult(interp, " - ", zErr, 0);
    sqlite3_free(zErr);
  }
  return TCL_ERROR;
}

static int test_table_filter(void *pCtx, const char *zTbl){
  TestSession *p = (TestSession*)pCtx;
  Tcl_Obj *pEval;
  int rc;
  int bRes = 0;

  pEval = Tcl_DuplicateObj(p->pFilterScript);
  Tcl_IncrRefCount(pEval);
  rc = Tcl_ListObjAppendElement(p->interp, pEval, Tcl_NewStringObj(zTbl, -1));
  if( rc==TCL_OK ){
    rc = Tcl_EvalObjEx(p->interp, pEval, TCL_EVAL_GLOBAL);
  }
  if( rc==TCL_OK ){
    rc = Tcl_GetBooleanFromObj(p->interp, Tcl_GetObjResult(p->interp), &bRes);
  }
  if( rc!=TCL_OK ){
    /* printf("error: %s\n", Tcl_GetStringResult(p->interp)); */
    Tcl_BackgroundError(p->interp);
  }
  Tcl_DecrRefCount(pEval);

  return bRes;
}

struct TestSessionsBlob {
  void *p;
  int n;
};
typedef struct TestSessionsBlob TestSessionsBlob;

static int testStreamOutput(
  void *pCtx,
  const void *pData,
  int nData
){
  TestSessionsBlob *pBlob = (TestSessionsBlob*)pCtx;
  char *pNew;

  assert( nData>0 );
  pNew = (char*)sqlite3_realloc(pBlob->p, pBlob->n + nData);
  if( pNew==0 ){
    return SQLITE_NOMEM;
  }
  pBlob->p = (void*)pNew;
  memcpy(&pNew[pBlob->n], pData, nData);
  pBlob->n += nData;
  return SQLITE_OK;
}

/*
** Tclcmd:  $session attach TABLE
**          $session changeset
**          $session delete
**          $session enable BOOL
**          $session indirect INTEGER
**          $session patchset
**          $session table_filter SCRIPT
*/
static int SQLITE_TCLAPI test_session_cmd(
  void *clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  TestSession *p = (TestSession*)clientData;
  sqlite3_session *pSession = p->pSession;
  struct SessionSubcmd {
    const char *zSub;
    int nArg;
    const char *zMsg;
    int iSub;
  } aSub[] = {
    { "attach",       1, "TABLE",      }, /* 0 */
    { "changeset",    0, "",           }, /* 1 */
    { "delete",       0, "",           }, /* 2 */
    { "enable",       1, "BOOL",       }, /* 3 */
    { "indirect",     1, "BOOL",       }, /* 4 */
    { "isempty",      0, "",           }, /* 5 */
    { "table_filter", 1, "SCRIPT",     }, /* 6 */
    { "patchset",     0, "",           }, /* 7 */
    { "diff",         2, "FROMDB TBL", }, /* 8 */
    { 0 }
  };
  int iSub;
  int rc;

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
    case 0: {      /* attach */
      char *zArg = Tcl_GetString(objv[2]);
      if( zArg[0]=='*' && zArg[1]=='\0' ) zArg = 0;
      rc = sqlite3session_attach(pSession, zArg);
      if( rc!=SQLITE_OK ){
        return test_session_error(interp, rc, 0);
      }
      break;
    }

    case 7:        /* patchset */
    case 1: {      /* changeset */
      TestSessionsBlob o = {0, 0};
      if( test_tcl_integer(interp, SESSION_STREAM_TCL_VAR) ){
        void *pCtx = (void*)&o;
        if( iSub==7 ){
          rc = sqlite3session_patchset_strm(pSession, testStreamOutput, pCtx);
        }else{
          rc = sqlite3session_changeset_strm(pSession, testStreamOutput, pCtx);
        }
      }else{
        if( iSub==7 ){
          rc = sqlite3session_patchset(pSession, &o.n, &o.p);
        }else{
          rc = sqlite3session_changeset(pSession, &o.n, &o.p);
        }
      }
      if( rc==SQLITE_OK ){
        Tcl_SetObjResult(interp, Tcl_NewByteArrayObj(o.p, o.n)); 
      }
      sqlite3_free(o.p);
      if( rc!=SQLITE_OK ){
        return test_session_error(interp, rc, 0);
      }
      break;
    }

    case 2:        /* delete */
      Tcl_DeleteCommand(interp, Tcl_GetString(objv[0]));
      break;

    case 3: {      /* enable */
      int val;
      if( Tcl_GetIntFromObj(interp, objv[2], &val) ) return TCL_ERROR;
      val = sqlite3session_enable(pSession, val);
      Tcl_SetObjResult(interp, Tcl_NewBooleanObj(val));
      break;
    }

    case 4: {      /* indirect */
      int val;
      if( Tcl_GetIntFromObj(interp, objv[2], &val) ) return TCL_ERROR;
      val = sqlite3session_indirect(pSession, val);
      Tcl_SetObjResult(interp, Tcl_NewBooleanObj(val));
      break;
    }

    case 5: {      /* isempty */
      int val;
      val = sqlite3session_isempty(pSession);
      Tcl_SetObjResult(interp, Tcl_NewBooleanObj(val));
      break;
    }
            
    case 6: {      /* table_filter */
      if( p->pFilterScript ) Tcl_DecrRefCount(p->pFilterScript);
      p->interp = interp;
      p->pFilterScript = Tcl_DuplicateObj(objv[2]);
      Tcl_IncrRefCount(p->pFilterScript);
      sqlite3session_table_filter(pSession, test_table_filter, clientData);
      break;
    }

    case 8: {      /* diff */
      char *zErr = 0;
      rc = sqlite3session_diff(pSession, 
          Tcl_GetString(objv[2]),
          Tcl_GetString(objv[3]),
          &zErr
      );
      assert( rc!=SQLITE_OK || zErr==0 );
      if( rc ){
        return test_session_error(interp, rc, zErr);
      }
      break;
    }
  }

  return TCL_OK;
}

static void SQLITE_TCLAPI test_session_del(void *clientData){
  TestSession *p = (TestSession*)clientData;
  if( p->pFilterScript ) Tcl_DecrRefCount(p->pFilterScript);
  sqlite3session_delete(p->pSession);
  ckfree((char*)p);
}

/*
** Tclcmd:  sqlite3session CMD DB-HANDLE DB-NAME
*/
static int SQLITE_TCLAPI test_sqlite3session(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3 *db;
  Tcl_CmdInfo info;
  int rc;                         /* sqlite3session_create() return code */
  TestSession *p;                 /* New wrapper object */

  if( objc!=4 ){
    Tcl_WrongNumArgs(interp, 1, objv, "CMD DB-HANDLE DB-NAME");
    return TCL_ERROR;
  }

  if( 0==Tcl_GetCommandInfo(interp, Tcl_GetString(objv[2]), &info) ){
    Tcl_AppendResult(interp, "no such handle: ", Tcl_GetString(objv[2]), 0);
    return TCL_ERROR;
  }
  db = *(sqlite3 **)info.objClientData;

  p = (TestSession*)ckalloc(sizeof(TestSession));
  memset(p, 0, sizeof(TestSession));
  rc = sqlite3session_create(db, Tcl_GetString(objv[3]), &p->pSession);
  if( rc!=SQLITE_OK ){
    ckfree((char*)p);
    return test_session_error(interp, rc, 0);
  }

  Tcl_CreateObjCommand(
      interp, Tcl_GetString(objv[1]), test_session_cmd, (ClientData)p,
      test_session_del
  );
  Tcl_SetObjResult(interp, objv[1]);
  return TCL_OK;
}

static void test_append_value(Tcl_Obj *pList, sqlite3_value *pVal){
  if( pVal==0 ){
    Tcl_ListObjAppendElement(0, pList, Tcl_NewObj());
    Tcl_ListObjAppendElement(0, pList, Tcl_NewObj());
  }else{
    Tcl_Obj *pObj;
    switch( sqlite3_value_type(pVal) ){
      case SQLITE_NULL:
        Tcl_ListObjAppendElement(0, pList, Tcl_NewStringObj("n", 1));
        pObj = Tcl_NewObj();
        break;
      case SQLITE_INTEGER:
        Tcl_ListObjAppendElement(0, pList, Tcl_NewStringObj("i", 1));
        pObj = Tcl_NewWideIntObj(sqlite3_value_int64(pVal));
        break;
      case SQLITE_FLOAT:
        Tcl_ListObjAppendElement(0, pList, Tcl_NewStringObj("f", 1));
        pObj = Tcl_NewDoubleObj(sqlite3_value_double(pVal));
        break;
      case SQLITE_TEXT: {
        const char *z = (char*)sqlite3_value_blob(pVal);
        int n = sqlite3_value_bytes(pVal);
        Tcl_ListObjAppendElement(0, pList, Tcl_NewStringObj("t", 1));
        pObj = Tcl_NewStringObj(z, n);
        break;
      }
      default:
        assert( sqlite3_value_type(pVal)==SQLITE_BLOB );
        Tcl_ListObjAppendElement(0, pList, Tcl_NewStringObj("b", 1));
        pObj = Tcl_NewByteArrayObj(
            sqlite3_value_blob(pVal),
            sqlite3_value_bytes(pVal)
        );
        break;
    }
    Tcl_ListObjAppendElement(0, pList, pObj);
  }
}

typedef struct TestConflictHandler TestConflictHandler;
struct TestConflictHandler {
  Tcl_Interp *interp;
  Tcl_Obj *pConflictScript;
  Tcl_Obj *pFilterScript;
};

static int test_obj_eq_string(Tcl_Obj *p, const char *z){
  int n;
  int nObj;
  char *zObj;

  n = (int)strlen(z);
  zObj = Tcl_GetStringFromObj(p, &nObj);

  return (nObj==n && (n==0 || 0==memcmp(zObj, z, n)));
}

static int test_filter_handler(
  void *pCtx,                     /* Pointer to TestConflictHandler structure */
  const char *zTab                /* Table name */
){
  TestConflictHandler *p = (TestConflictHandler *)pCtx;
  int res = 1;
  Tcl_Obj *pEval;
  Tcl_Interp *interp = p->interp;

  pEval = Tcl_DuplicateObj(p->pFilterScript);
  Tcl_IncrRefCount(pEval);

  if( TCL_OK!=Tcl_ListObjAppendElement(0, pEval, Tcl_NewStringObj(zTab, -1))
   || TCL_OK!=Tcl_EvalObjEx(interp, pEval, TCL_EVAL_GLOBAL) 
   || TCL_OK!=Tcl_GetIntFromObj(interp, Tcl_GetObjResult(interp), &res)
  ){
    Tcl_BackgroundError(interp);
  }

  Tcl_DecrRefCount(pEval);
  return res;
}  

static int test_conflict_handler(
  void *pCtx,                     /* Pointer to TestConflictHandler structure */
  int eConf,                      /* DATA, MISSING, CONFLICT, CONSTRAINT */
  sqlite3_changeset_iter *pIter   /* Handle describing change and conflict */
){
  TestConflictHandler *p = (TestConflictHandler *)pCtx;
  Tcl_Obj *pEval;
  Tcl_Interp *interp = p->interp;
  int ret = 0;                    /* Return value */

  int op;                         /* SQLITE_UPDATE, DELETE or INSERT */
  const char *zTab;               /* Name of table conflict is on */
  int nCol;                       /* Number of columns in table zTab */

  pEval = Tcl_DuplicateObj(p->pConflictScript);
  Tcl_IncrRefCount(pEval);

  sqlite3changeset_op(pIter, &zTab, &nCol, &op, 0);

  if( eConf==SQLITE_CHANGESET_FOREIGN_KEY ){
    int nFk;
    sqlite3changeset_fk_conflicts(pIter, &nFk);
    Tcl_ListObjAppendElement(0, pEval, Tcl_NewStringObj("FOREIGN_KEY", -1));
    Tcl_ListObjAppendElement(0, pEval, Tcl_NewIntObj(nFk));
  }else{

    /* Append the operation type. */
    Tcl_ListObjAppendElement(0, pEval, Tcl_NewStringObj(
        op==SQLITE_INSERT ? "INSERT" :
        op==SQLITE_UPDATE ? "UPDATE" : 
        "DELETE", -1
    ));
  
    /* Append the table name. */
    Tcl_ListObjAppendElement(0, pEval, Tcl_NewStringObj(zTab, -1));
  
    /* Append the conflict type. */
    switch( eConf ){
      case SQLITE_CHANGESET_DATA:
        Tcl_ListObjAppendElement(interp, pEval,Tcl_NewStringObj("DATA",-1));
        break;
      case SQLITE_CHANGESET_NOTFOUND:
        Tcl_ListObjAppendElement(interp, pEval,Tcl_NewStringObj("NOTFOUND",-1));
        break;
      case SQLITE_CHANGESET_CONFLICT:
        Tcl_ListObjAppendElement(interp, pEval,Tcl_NewStringObj("CONFLICT",-1));
        break;
      case SQLITE_CHANGESET_CONSTRAINT:
        Tcl_ListObjAppendElement(interp, pEval,Tcl_NewStringObj("CONSTRAINT",-1));
        break;
    }
  
    /* If this is not an INSERT, append the old row */
    if( op!=SQLITE_INSERT ){
      int i;
      Tcl_Obj *pOld = Tcl_NewObj();
      for(i=0; i<nCol; i++){
        sqlite3_value *pVal;
        sqlite3changeset_old(pIter, i, &pVal);
        test_append_value(pOld, pVal);
      }
      Tcl_ListObjAppendElement(0, pEval, pOld);
    }

    /* If this is not a DELETE, append the new row */
    if( op!=SQLITE_DELETE ){
      int i;
      Tcl_Obj *pNew = Tcl_NewObj();
      for(i=0; i<nCol; i++){
        sqlite3_value *pVal;
        sqlite3changeset_new(pIter, i, &pVal);
        test_append_value(pNew, pVal);
      }
      Tcl_ListObjAppendElement(0, pEval, pNew);
    }

    /* If this is a CHANGESET_DATA or CHANGESET_CONFLICT conflict, append
     ** the conflicting row.  */
    if( eConf==SQLITE_CHANGESET_DATA || eConf==SQLITE_CHANGESET_CONFLICT ){
      int i;
      Tcl_Obj *pConflict = Tcl_NewObj();
      for(i=0; i<nCol; i++){
        int rc;
        sqlite3_value *pVal;
        rc = sqlite3changeset_conflict(pIter, i, &pVal);
        assert( rc==SQLITE_OK );
        test_append_value(pConflict, pVal);
      }
      Tcl_ListObjAppendElement(0, pEval, pConflict);
    }

    /***********************************************************************
     ** This block is purely for testing some error conditions.
     */
    if( eConf==SQLITE_CHANGESET_CONSTRAINT 
     || eConf==SQLITE_CHANGESET_NOTFOUND 
    ){
      sqlite3_value *pVal;
      int rc = sqlite3changeset_conflict(pIter, 0, &pVal);
      assert( rc==SQLITE_MISUSE );
    }else{
      sqlite3_value *pVal;
      int rc = sqlite3changeset_conflict(pIter, -1, &pVal);
      assert( rc==SQLITE_RANGE );
      rc = sqlite3changeset_conflict(pIter, nCol, &pVal);
      assert( rc==SQLITE_RANGE );
    }
    if( op==SQLITE_DELETE ){
      sqlite3_value *pVal;
      int rc = sqlite3changeset_new(pIter, 0, &pVal);
      assert( rc==SQLITE_MISUSE );
    }else{
      sqlite3_value *pVal;
      int rc = sqlite3changeset_new(pIter, -1, &pVal);
      assert( rc==SQLITE_RANGE );
      rc = sqlite3changeset_new(pIter, nCol, &pVal);
      assert( rc==SQLITE_RANGE );
    }
    if( op==SQLITE_INSERT ){
      sqlite3_value *pVal;
      int rc = sqlite3changeset_old(pIter, 0, &pVal);
      assert( rc==SQLITE_MISUSE );
    }else{
      sqlite3_value *pVal;
      int rc = sqlite3changeset_old(pIter, -1, &pVal);
      assert( rc==SQLITE_RANGE );
      rc = sqlite3changeset_old(pIter, nCol, &pVal);
      assert( rc==SQLITE_RANGE );
    }
    if( eConf!=SQLITE_CHANGESET_FOREIGN_KEY ){
      /* eConf!=FOREIGN_KEY is always true at this point. The condition is 
      ** just there to make it clearer what is being tested.  */
      int nDummy;
      int rc = sqlite3changeset_fk_conflicts(pIter, &nDummy);
      assert( rc==SQLITE_MISUSE );
    }
    /* End of testing block
    ***********************************************************************/
  }

  if( TCL_OK!=Tcl_EvalObjEx(interp, pEval, TCL_EVAL_GLOBAL) ){
    Tcl_BackgroundError(interp);
  }else{
    Tcl_Obj *pRes = Tcl_GetObjResult(interp);
    if( test_obj_eq_string(pRes, "OMIT") || test_obj_eq_string(pRes, "") ){
      ret = SQLITE_CHANGESET_OMIT;
    }else if( test_obj_eq_string(pRes, "REPLACE") ){
      ret = SQLITE_CHANGESET_REPLACE;
    }else if( test_obj_eq_string(pRes, "ABORT") ){
      ret = SQLITE_CHANGESET_ABORT;
    }else{
      Tcl_GetIntFromObj(0, pRes, &ret);
    }
  }

  Tcl_DecrRefCount(pEval);
  return ret;
}

/*
** The conflict handler used by sqlite3changeset_apply_replace_all(). 
** This conflict handler calls sqlite3_value_text16() on all available
** sqlite3_value objects and then returns CHANGESET_REPLACE, or 
** CHANGESET_OMIT if REPLACE is not applicable. This is used to test the
** effect of a malloc failure within an sqlite3_value_xxx() function
** invoked by a conflict-handler callback.
*/
static int replace_handler(
  void *pCtx,                     /* Pointer to TestConflictHandler structure */
  int eConf,                      /* DATA, MISSING, CONFLICT, CONSTRAINT */
  sqlite3_changeset_iter *pIter   /* Handle describing change and conflict */
){
  int op;                         /* SQLITE_UPDATE, DELETE or INSERT */
  const char *zTab;               /* Name of table conflict is on */
  int nCol;                       /* Number of columns in table zTab */
  int i;
  int x = 0;

  sqlite3changeset_op(pIter, &zTab, &nCol, &op, 0);

  if( op!=SQLITE_INSERT ){
    for(i=0; i<nCol; i++){
      sqlite3_value *pVal;
      sqlite3changeset_old(pIter, i, &pVal);
      sqlite3_value_text16(pVal);
      x++;
    }
  }

  if( op!=SQLITE_DELETE ){
    for(i=0; i<nCol; i++){
      sqlite3_value *pVal;
      sqlite3changeset_new(pIter, i, &pVal);
      sqlite3_value_text16(pVal);
      x++;
    }
  }

  if( eConf==SQLITE_CHANGESET_DATA ){
    return SQLITE_CHANGESET_REPLACE;
  }
  return SQLITE_CHANGESET_OMIT;
}

static int testStreamInput(
  void *pCtx,                     /* Context pointer */
  void *pData,                    /* Buffer to populate */
  int *pnData                     /* IN/OUT: Bytes requested/supplied */
){
  TestStreamInput *p = (TestStreamInput*)pCtx;
  int nReq = *pnData;             /* Bytes of data requested */
  int nRem = p->nData - p->iData; /* Bytes of data available */
  int nRet = p->nStream;          /* Bytes actually returned */

  /* Allocate and free some space. There is no point to this, other than
  ** that it allows the regular OOM fault-injection tests to cause an error
  ** in this function.  */
  void *pAlloc = sqlite3_malloc(10);
  if( pAlloc==0 ) return SQLITE_NOMEM;
  sqlite3_free(pAlloc);

  if( nRet>nReq ) nRet = nReq;
  if( nRet>nRem ) nRet = nRem;

  assert( nRet>=0 );
  if( nRet>0 ){
    memcpy(pData, &p->aData[p->iData], nRet);
    p->iData += nRet;
  }

  *pnData = nRet;
  return SQLITE_OK;
}


static int SQLITE_TCLAPI testSqlite3changesetApply(
  int bV2,
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3 *db;                    /* Database handle */
  Tcl_CmdInfo info;               /* Database Tcl command (objv[1]) info */
  int rc;                         /* Return code from changeset_invert() */
  void *pChangeset;               /* Buffer containing changeset */
  int nChangeset;                 /* Size of buffer aChangeset in bytes */
  TestConflictHandler ctx;
  TestStreamInput sStr;
  void *pRebase = 0;
  int nRebase = 0;
  int flags = 0;                  /* Flags for apply_v2() */

  memset(&sStr, 0, sizeof(sStr));
  sStr.nStream = test_tcl_integer(interp, SESSION_STREAM_TCL_VAR);

  /* Check for the -nosavepoint flag */
  if( bV2 ){
    if( objc>1 ){
      const char *z1 = Tcl_GetString(objv[1]);
      int n = strlen(z1);
      if( n>1 && n<=12 && 0==sqlite3_strnicmp("-nosavepoint", z1, n) ){
        flags |= SQLITE_CHANGESETAPPLY_NOSAVEPOINT;
        objc--;
        objv++;
      }
    }
    if( objc>1 ){
      const char *z1 = Tcl_GetString(objv[1]);
      int n = strlen(z1);
      if( n>1 && n<=7 && 0==sqlite3_strnicmp("-invert", z1, n) ){
        flags |= SQLITE_CHANGESETAPPLY_INVERT;
        objc--;
        objv++;
      }
    }
  }

  if( objc!=4 && objc!=5 ){
    const char *zMsg;
    if( bV2 ){
      zMsg = "?-nosavepoint? ?-inverse? "
        "DB CHANGESET CONFLICT-SCRIPT ?FILTER-SCRIPT?";
    }else{
      zMsg = "DB CHANGESET CONFLICT-SCRIPT ?FILTER-SCRIPT?";
    }
    Tcl_WrongNumArgs(interp, 1, objv, zMsg);
    return TCL_ERROR;
  }
  if( 0==Tcl_GetCommandInfo(interp, Tcl_GetString(objv[1]), &info) ){
    Tcl_AppendResult(interp, "no such handle: ", Tcl_GetString(objv[1]), 0);
    return TCL_ERROR;
  }
  db = *(sqlite3 **)info.objClientData;
  pChangeset = (void *)Tcl_GetByteArrayFromObj(objv[2], &nChangeset);
  ctx.pConflictScript = objv[3];
  ctx.pFilterScript = objc==5 ? objv[4] : 0;
  ctx.interp = interp;

  if( sStr.nStream==0 ){
    if( bV2==0 ){
      rc = sqlite3changeset_apply(db, nChangeset, pChangeset, 
          (objc==5)?test_filter_handler:0, test_conflict_handler, (void *)&ctx
      );
    }else{
      rc = sqlite3changeset_apply_v2(db, nChangeset, pChangeset, 
          (objc==5)?test_filter_handler:0, test_conflict_handler, (void *)&ctx,
          &pRebase, &nRebase, flags
      );
    }
  }else{
    sStr.aData = (unsigned char*)pChangeset;
    sStr.nData = nChangeset;
    if( bV2==0 ){
      rc = sqlite3changeset_apply_strm(db, testStreamInput, (void*)&sStr,
          (objc==5) ? test_filter_handler : 0, 
          test_conflict_handler, (void *)&ctx
      );
    }else{
      rc = sqlite3changeset_apply_v2_strm(db, testStreamInput, (void*)&sStr,
          (objc==5) ? test_filter_handler : 0, 
          test_conflict_handler, (void *)&ctx,
          &pRebase, &nRebase, flags
      );
    }
  }

  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }else{
    Tcl_ResetResult(interp);
    if( bV2 && pRebase ){
      Tcl_SetObjResult(interp, Tcl_NewByteArrayObj(pRebase, nRebase));
    }
  }
  sqlite3_free(pRebase);
  return TCL_OK;
}

/*
** sqlite3changeset_apply DB CHANGESET CONFLICT-SCRIPT ?FILTER-SCRIPT?
*/
static int SQLITE_TCLAPI test_sqlite3changeset_apply(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  return testSqlite3changesetApply(0, clientData, interp, objc, objv);
}
/*
** sqlite3changeset_apply_v2 DB CHANGESET CONFLICT-SCRIPT ?FILTER-SCRIPT?
*/
static int SQLITE_TCLAPI test_sqlite3changeset_apply_v2(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  return testSqlite3changesetApply(1, clientData, interp, objc, objv);
}

/*
** sqlite3changeset_apply_replace_all DB CHANGESET 
*/
static int SQLITE_TCLAPI test_sqlite3changeset_apply_replace_all(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  sqlite3 *db;                    /* Database handle */
  Tcl_CmdInfo info;               /* Database Tcl command (objv[1]) info */
  int rc;                         /* Return code from changeset_invert() */
  void *pChangeset;               /* Buffer containing changeset */
  int nChangeset;                 /* Size of buffer aChangeset in bytes */

  if( objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "DB CHANGESET");
    return TCL_ERROR;
  }
  if( 0==Tcl_GetCommandInfo(interp, Tcl_GetString(objv[1]), &info) ){
    Tcl_AppendResult(interp, "no such handle: ", Tcl_GetString(objv[2]), 0);
    return TCL_ERROR;
  }
  db = *(sqlite3 **)info.objClientData;
  pChangeset = (void *)Tcl_GetByteArrayFromObj(objv[2], &nChangeset);

  rc = sqlite3changeset_apply(db, nChangeset, pChangeset, 0, replace_handler,0);
  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }
  Tcl_ResetResult(interp);
  return TCL_OK;
}


/*
** sqlite3changeset_invert CHANGESET
*/
static int SQLITE_TCLAPI test_sqlite3changeset_invert(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int rc;                         /* Return code from changeset_invert() */
  TestStreamInput sIn;            /* Input stream */
  TestSessionsBlob sOut;          /* Output blob */

  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "CHANGESET");
    return TCL_ERROR;
  }

  memset(&sIn, 0, sizeof(sIn));
  memset(&sOut, 0, sizeof(sOut));
  sIn.nStream = test_tcl_integer(interp, SESSION_STREAM_TCL_VAR);
  sIn.aData = Tcl_GetByteArrayFromObj(objv[1], &sIn.nData);

  if( sIn.nStream ){
    rc = sqlite3changeset_invert_strm(
        testStreamInput, (void*)&sIn, testStreamOutput, (void*)&sOut
    );
  }else{
    rc = sqlite3changeset_invert(sIn.nData, sIn.aData, &sOut.n, &sOut.p);
  }
  if( rc!=SQLITE_OK ){
    rc = test_session_error(interp, rc, 0);
  }else{
    Tcl_SetObjResult(interp,Tcl_NewByteArrayObj((unsigned char*)sOut.p,sOut.n));
  }
  sqlite3_free(sOut.p);
  return rc;
}

/*
** sqlite3changeset_concat LEFT RIGHT
*/
static int SQLITE_TCLAPI test_sqlite3changeset_concat(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int rc;                         /* Return code from changeset_invert() */

  TestStreamInput sLeft;          /* Input stream */
  TestStreamInput sRight;         /* Input stream */
  TestSessionsBlob sOut = {0,0};  /* Output blob */

  if( objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "LEFT RIGHT");
    return TCL_ERROR;
  }

  memset(&sLeft, 0, sizeof(sLeft));
  memset(&sRight, 0, sizeof(sRight));
  sLeft.aData = Tcl_GetByteArrayFromObj(objv[1], &sLeft.nData);
  sRight.aData = Tcl_GetByteArrayFromObj(objv[2], &sRight.nData);
  sLeft.nStream = test_tcl_integer(interp, SESSION_STREAM_TCL_VAR);
  sRight.nStream = sLeft.nStream;

  if( sLeft.nStream>0 ){
    rc = sqlite3changeset_concat_strm(
        testStreamInput, (void*)&sLeft,
        testStreamInput, (void*)&sRight,
        testStreamOutput, (void*)&sOut
    );
  }else{
    rc = sqlite3changeset_concat(
        sLeft.nData, sLeft.aData, sRight.nData, sRight.aData, &sOut.n, &sOut.p
    );
  }

  if( rc!=SQLITE_OK ){
    rc = test_session_error(interp, rc, 0);
  }else{
    Tcl_SetObjResult(interp,Tcl_NewByteArrayObj((unsigned char*)sOut.p,sOut.n));
  }
  sqlite3_free(sOut.p);
  return rc;
}

/*
** sqlite3session_foreach VARNAME CHANGESET SCRIPT
*/
static int SQLITE_TCLAPI test_sqlite3session_foreach(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  void *pChangeset;
  int nChangeset;
  sqlite3_changeset_iter *pIter;
  int rc;
  Tcl_Obj *pVarname;
  Tcl_Obj *pCS;
  Tcl_Obj *pScript;
  int isCheckNext = 0;
  int isInvert = 0;

  TestStreamInput sStr;
  memset(&sStr, 0, sizeof(sStr));

  while( objc>1 ){
    char *zOpt = Tcl_GetString(objv[1]);
    int nOpt = strlen(zOpt);
    if( zOpt[0]!='-' ) break;
    if( nOpt<=7 && 0==sqlite3_strnicmp(zOpt, "-invert", nOpt) ){
      isInvert = 1;
    }else
    if( nOpt<=5 && 0==sqlite3_strnicmp(zOpt, "-next", nOpt) ){
      isCheckNext = 1;
    }else{
      break;
    }
    objv++;
    objc--;
  }
  if( objc!=4 ){
    Tcl_WrongNumArgs(
        interp, 1, objv, "?-next? ?-invert? VARNAME CHANGESET SCRIPT");
    return TCL_ERROR;
  }

  pVarname = objv[1];
  pCS = objv[2];
  pScript = objv[3];

  pChangeset = (void *)Tcl_GetByteArrayFromObj(pCS, &nChangeset);
  sStr.nStream = test_tcl_integer(interp, SESSION_STREAM_TCL_VAR);
  if( isInvert ){
    int f = SQLITE_CHANGESETSTART_INVERT;
    if( sStr.nStream==0 ){
      rc = sqlite3changeset_start_v2(&pIter, nChangeset, pChangeset, f);
    }else{
      void *pCtx = (void*)&sStr;
      sStr.aData = (unsigned char*)pChangeset;
      sStr.nData = nChangeset;
      rc = sqlite3changeset_start_v2_strm(&pIter, testStreamInput, pCtx, f);
    }
  }else{
    if( sStr.nStream==0 ){
      rc = sqlite3changeset_start(&pIter, nChangeset, pChangeset);
    }else{
      sStr.aData = (unsigned char*)pChangeset;
      sStr.nData = nChangeset;
      rc = sqlite3changeset_start_strm(&pIter, testStreamInput, (void*)&sStr);
    }
  }
  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }

  while( SQLITE_ROW==sqlite3changeset_next(pIter) ){
    int nCol;                     /* Number of columns in table */
    int nCol2;                    /* Number of columns in table */
    int op;                       /* SQLITE_INSERT, UPDATE or DELETE */
    const char *zTab;             /* Name of table change applies to */
    Tcl_Obj *pVar;                /* Tcl value to set $VARNAME to */
    Tcl_Obj *pOld;                /* Vector of old.* values */
    Tcl_Obj *pNew;                /* Vector of new.* values */
    int bIndirect;

    char *zPK;
    unsigned char *abPK;
    int i;

    /* Test that _fk_conflicts() returns SQLITE_MISUSE if called on this
    ** iterator. */
    int nDummy;
    if( SQLITE_MISUSE!=sqlite3changeset_fk_conflicts(pIter, &nDummy) ){
      sqlite3changeset_finalize(pIter);
      return TCL_ERROR;
    }

    sqlite3changeset_op(pIter, &zTab, &nCol, &op, &bIndirect);
    pVar = Tcl_NewObj();
    Tcl_ListObjAppendElement(0, pVar, Tcl_NewStringObj(
          op==SQLITE_INSERT ? "INSERT" :
          op==SQLITE_UPDATE ? "UPDATE" : 
          "DELETE", -1
    ));

    Tcl_ListObjAppendElement(0, pVar, Tcl_NewStringObj(zTab, -1));
    Tcl_ListObjAppendElement(0, pVar, Tcl_NewBooleanObj(bIndirect));

    zPK = ckalloc(nCol+1);
    memset(zPK, 0, nCol+1);
    sqlite3changeset_pk(pIter, &abPK, &nCol2);
    assert( nCol==nCol2 );
    for(i=0; i<nCol; i++){
      zPK[i] = (abPK[i] ? 'X' : '.');
    }
    Tcl_ListObjAppendElement(0, pVar, Tcl_NewStringObj(zPK, -1));
    ckfree(zPK);

    pOld = Tcl_NewObj();
    if( op!=SQLITE_INSERT ){
      for(i=0; i<nCol; i++){
        sqlite3_value *pVal;
        sqlite3changeset_old(pIter, i, &pVal);
        test_append_value(pOld, pVal);
      }
    }
    pNew = Tcl_NewObj();
    if( op!=SQLITE_DELETE ){
      for(i=0; i<nCol; i++){
        sqlite3_value *pVal;
        sqlite3changeset_new(pIter, i, &pVal);
        test_append_value(pNew, pVal);
      }
    }
    Tcl_ListObjAppendElement(0, pVar, pOld);
    Tcl_ListObjAppendElement(0, pVar, pNew);

    Tcl_ObjSetVar2(interp, pVarname, 0, pVar, 0);
    rc = Tcl_EvalObjEx(interp, pScript, 0);
    if( rc!=TCL_OK && rc!=TCL_CONTINUE ){
      sqlite3changeset_finalize(pIter);
      return rc==TCL_BREAK ? TCL_OK : rc;
    }
  }

  if( isCheckNext ){
    int rc2 = sqlite3changeset_next(pIter);
    rc = sqlite3changeset_finalize(pIter);
    assert( (rc2==SQLITE_DONE && rc==SQLITE_OK) || rc2==rc );
  }else{
    rc = sqlite3changeset_finalize(pIter);
  }
  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }

  return TCL_OK;
}

/*
** tclcmd: CMD configure REBASE-BLOB
** tclcmd: CMD rebase CHANGESET
** tclcmd: CMD delete
*/
static int SQLITE_TCLAPI test_rebaser_cmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  struct RebaseSubcmd {
    const char *zSub;
    int nArg;
    const char *zMsg;
    int iSub;
  } aSub[] = {
    { "configure",    1, "REBASE-BLOB" }, /* 0 */
    { "delete",       0, ""            }, /* 1 */
    { "rebase",       1, "CHANGESET"   }, /* 2 */
    { 0 }
  };

  sqlite3_rebaser *p = (sqlite3_rebaser*)clientData;
  int iSub;
  int rc;

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

  assert( iSub==0 || iSub==1 || iSub==2 );
  assert( rc==SQLITE_OK );
  switch( iSub ){
    case 0: {   /* configure */
      int nRebase = 0;
      unsigned char *pRebase = Tcl_GetByteArrayFromObj(objv[2], &nRebase);
      rc = sqlite3rebaser_configure(p, nRebase, pRebase);
      break;
    }

    case 1:     /* delete */
      Tcl_DeleteCommand(interp, Tcl_GetString(objv[0]));
      break;

    default: {  /* rebase */
      TestStreamInput sStr;                 /* Input stream */
      TestSessionsBlob sOut;                /* Output blob */

      memset(&sStr, 0, sizeof(sStr));
      memset(&sOut, 0, sizeof(sOut));
      sStr.aData = Tcl_GetByteArrayFromObj(objv[2], &sStr.nData);
      sStr.nStream = test_tcl_integer(interp, SESSION_STREAM_TCL_VAR);

      if( sStr.nStream ){
        rc = sqlite3rebaser_rebase_strm(p, 
            testStreamInput, (void*)&sStr,
            testStreamOutput, (void*)&sOut
        );
      }else{
        rc = sqlite3rebaser_rebase(p, sStr.nData, sStr.aData, &sOut.n, &sOut.p);
      }

      if( rc==SQLITE_OK ){
        Tcl_SetObjResult(interp, Tcl_NewByteArrayObj(sOut.p, sOut.n));
      }
      sqlite3_free(sOut.p);
      break;
    }
  }

  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }
  return TCL_OK;
}

static void SQLITE_TCLAPI test_rebaser_del(void *clientData){
  sqlite3_rebaser *p = (sqlite3_rebaser*)clientData;
  sqlite3rebaser_delete(p);
}

/*
** tclcmd: sqlite3rebaser_create NAME
*/
static int SQLITE_TCLAPI test_sqlite3rebaser_create(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int rc;
  sqlite3_rebaser *pNew = 0;
  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "NAME");
    return SQLITE_ERROR;
  }

  rc = sqlite3rebaser_create(&pNew);
  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }

  Tcl_CreateObjCommand(interp, Tcl_GetString(objv[1]), test_rebaser_cmd,
      (ClientData)pNew, test_rebaser_del
  );
  Tcl_SetObjResult(interp, objv[1]);
  return TCL_OK;
}

/*
** tclcmd: sqlite3rebaser_configure OP VALUE
*/
static int SQLITE_TCLAPI test_sqlite3session_config(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  struct ConfigOpt {
    const char *zSub;
    int op;
  } aSub[] = {
    { "strm_size",    SQLITE_SESSION_CONFIG_STRMSIZE },
    { "invalid",      0 },
    { 0 }
  };
  int rc;
  int iSub;
  int iVal;

  if( objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "OP VALUE");
    return SQLITE_ERROR;
  }
  rc = Tcl_GetIndexFromObjStruct(interp, 
      objv[1], aSub, sizeof(aSub[0]), "sub-command", 0, &iSub
  );
  if( rc!=TCL_OK ) return rc;
  if( Tcl_GetIntFromObj(interp, objv[2], &iVal) ) return TCL_ERROR;

  rc = sqlite3session_config(aSub[iSub].op, (void*)&iVal);
  if( rc!=SQLITE_OK ){
    return test_session_error(interp, rc, 0);
  }
  Tcl_SetObjResult(interp, Tcl_NewIntObj(iVal));
  return TCL_OK;
}

int TestSession_Init(Tcl_Interp *interp){
  struct Cmd {
    const char *zCmd;
    Tcl_ObjCmdProc *xProc;
  } aCmd[] = {
    { "sqlite3session", test_sqlite3session },
    { "sqlite3session_foreach", test_sqlite3session_foreach },
    { "sqlite3changeset_invert", test_sqlite3changeset_invert },
    { "sqlite3changeset_concat", test_sqlite3changeset_concat },
    { "sqlite3changeset_apply", test_sqlite3changeset_apply },
    { "sqlite3changeset_apply_v2", test_sqlite3changeset_apply_v2 },
    { "sqlite3changeset_apply_replace_all", 
      test_sqlite3changeset_apply_replace_all },
    { "sql_exec_changeset", test_sql_exec_changeset },
    { "sqlite3rebaser_create", test_sqlite3rebaser_create },
    { "sqlite3session_config", test_sqlite3session_config },
  };
  int i;

  for(i=0; i<sizeof(aCmd)/sizeof(struct Cmd); i++){
    struct Cmd *p = &aCmd[i];
    Tcl_CreateObjCommand(interp, p->zCmd, p->xProc, 0, 0);
  }

  return TCL_OK;
}

#endif /* SQLITE_TEST && SQLITE_SESSION && SQLITE_PREUPDATE_HOOK */
