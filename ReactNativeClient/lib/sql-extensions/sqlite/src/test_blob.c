/*
** 2014 October 30
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
*/
#include "sqliteInt.h"
#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#endif
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#ifndef SQLITE_OMIT_INCRBLOB

/* These functions are implemented in main.c. */
extern const char *sqlite3ErrName(int);

/* From test1.c: */
extern int getDbPointer(Tcl_Interp *interp, const char *zA, sqlite3 **ppDb);
extern void *sqlite3TestTextToPtr(const char *z);

/*
** Return a pointer to a buffer containing a text representation of the
** pointer passed as the only argument. The original pointer may be extracted
** from the text using sqlite3TestTextToPtr().
*/
static char *ptrToText(void *p){
  static char buf[100];
  sqlite3_snprintf(sizeof(buf)-1, buf, "%p", p);
  return buf;
}

/*
** Attempt to extract a blob handle (type sqlite3_blob*) from the Tcl
** object passed as the second argument. If successful, set *ppBlob to
** point to the blob handle and return TCL_OK. Otherwise, store an error
** message in the tcl interpreter and return TCL_ERROR. The final value
** of *ppBlob is undefined in this case.
**
** If the object contains a string that begins with "incrblob_", then it
** is assumed to be the name of a Tcl channel opened using the [db incrblob] 
** command (see tclsqlite.c). Otherwise, it is assumed to be a pointer 
** encoded using the ptrToText() routine or similar.
*/
static int blobHandleFromObj(
  Tcl_Interp *interp, 
  Tcl_Obj *pObj,
  sqlite3_blob **ppBlob
){
  char *z;
  int n;

  z = Tcl_GetStringFromObj(pObj, &n);
  if( n==0 ){
    *ppBlob = 0;
  }else if( n>9 && 0==memcmp("incrblob_", z, 9) ){
    int notUsed;
    Tcl_Channel channel;
    ClientData instanceData;
    
    channel = Tcl_GetChannel(interp, z, &notUsed);
    if( !channel ) return TCL_ERROR;

    Tcl_Flush(channel);
    Tcl_Seek(channel, 0, SEEK_SET);

    instanceData = Tcl_GetChannelInstanceData(channel);
    *ppBlob = *((sqlite3_blob **)instanceData);
  }else{
    *ppBlob = (sqlite3_blob*)sqlite3TestTextToPtr(z);
  }

  return TCL_OK;
}

/*
** Like Tcl_GetString(), except that if the string is 0 bytes in size, a
** NULL Pointer is returned.
*/
static char *blobStringFromObj(Tcl_Obj *pObj){
  int n;
  char *z;
  z = Tcl_GetStringFromObj(pObj, &n);
  return (n ? z : 0);
}

/*
** sqlite3_blob_open DB DATABASE TABLE COLUMN ROWID FLAGS VARNAME
**
** Tcl test harness for the sqlite3_blob_open() function.
*/
static int SQLITE_TCLAPI test_blob_open(
  ClientData clientData,          /* Not used */
  Tcl_Interp *interp,             /* Calling TCL interpreter */
  int objc,                       /* Number of arguments */
  Tcl_Obj *CONST objv[]           /* Command arguments */
){
  sqlite3 *db;
  const char *zDb;
  const char *zTable;
  const char *zColumn;
  Tcl_WideInt iRowid;
  int flags;
  const char *zVarname;
  int nVarname;

  sqlite3_blob *pBlob = (sqlite3_blob*)&flags;   /* Non-zero initialization */
  int rc;

  if( objc!=8 ){
    const char *zUsage = "DB DATABASE TABLE COLUMN ROWID FLAGS VARNAME";
    Tcl_WrongNumArgs(interp, 1, objv, zUsage);
    return TCL_ERROR;
  }
  if( getDbPointer(interp, Tcl_GetString(objv[1]), &db) ) return TCL_ERROR;
  zDb = Tcl_GetString(objv[2]);
  zTable = blobStringFromObj(objv[3]);
  zColumn = Tcl_GetString(objv[4]);
  if( Tcl_GetWideIntFromObj(interp, objv[5], &iRowid) ) return TCL_ERROR;
  if( Tcl_GetIntFromObj(interp, objv[6], &flags) ) return TCL_ERROR;
  zVarname = Tcl_GetStringFromObj(objv[7], &nVarname);

  if( nVarname>0 ){
    rc = sqlite3_blob_open(db, zDb, zTable, zColumn, iRowid, flags, &pBlob);
    Tcl_SetVar(interp, zVarname, ptrToText(pBlob), 0);
  }else{
    rc = sqlite3_blob_open(db, zDb, zTable, zColumn, iRowid, flags, 0);
  }

  if( rc==SQLITE_OK ){
    Tcl_ResetResult(interp);
  }else{
    Tcl_SetResult(interp, (char*)sqlite3ErrName(rc), TCL_VOLATILE);
    return TCL_ERROR;
  }
  return TCL_OK;
}


/*
** sqlite3_blob_close  HANDLE
*/
static int SQLITE_TCLAPI test_blob_close(
  ClientData clientData, /* Not used */
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int objc,              /* Number of arguments */
  Tcl_Obj *CONST objv[]  /* Command arguments */
){
  sqlite3_blob *pBlob;
  int rc;
  
  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "HANDLE");
    return TCL_ERROR;
  }

  if( blobHandleFromObj(interp, objv[1], &pBlob) ) return TCL_ERROR;
  rc = sqlite3_blob_close(pBlob);

  if( rc ){
    Tcl_SetResult(interp, (char*)sqlite3ErrName(rc), TCL_VOLATILE);
  }else{
    Tcl_ResetResult(interp);
  }
  return TCL_OK;
}

/*
** sqlite3_blob_bytes  HANDLE
*/
static int SQLITE_TCLAPI test_blob_bytes(
  ClientData clientData, /* Not used */
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int objc,              /* Number of arguments */
  Tcl_Obj *CONST objv[]  /* Command arguments */
){
  sqlite3_blob *pBlob;
  int nByte;
  
  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "HANDLE");
    return TCL_ERROR;
  }

  if( blobHandleFromObj(interp, objv[1], &pBlob) ) return TCL_ERROR;
  nByte = sqlite3_blob_bytes(pBlob);
  Tcl_SetObjResult(interp, Tcl_NewIntObj(nByte));

  return TCL_OK;
}

/*
** sqlite3_blob_read  CHANNEL OFFSET N
**
**   This command is used to test the sqlite3_blob_read() in ways that
**   the Tcl channel interface does not. The first argument should
**   be the name of a valid channel created by the [incrblob] method
**   of a database handle. This function calls sqlite3_blob_read()
**   to read N bytes from offset OFFSET from the underlying SQLite
**   blob handle.
**
**   On success, a byte-array object containing the read data is 
**   returned. On failure, the interpreter result is set to the
**   text representation of the returned error code (i.e. "SQLITE_NOMEM")
**   and a Tcl exception is thrown.
*/
static int SQLITE_TCLAPI test_blob_read(
  ClientData clientData, /* Not used */
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int objc,              /* Number of arguments */
  Tcl_Obj *CONST objv[]  /* Command arguments */
){
  sqlite3_blob *pBlob;
  int nByte;
  int iOffset;
  unsigned char *zBuf = 0;
  int rc;
  
  if( objc!=4 ){
    Tcl_WrongNumArgs(interp, 1, objv, "CHANNEL OFFSET N");
    return TCL_ERROR;
  }

  if( blobHandleFromObj(interp, objv[1], &pBlob) ) return TCL_ERROR;
  if( TCL_OK!=Tcl_GetIntFromObj(interp, objv[2], &iOffset)
   || TCL_OK!=Tcl_GetIntFromObj(interp, objv[3], &nByte)
  ){ 
    return TCL_ERROR;
  }

  if( nByte>0 ){
    zBuf = (unsigned char *)Tcl_AttemptAlloc(nByte);
    if( zBuf==0 ){
      Tcl_AppendResult(interp, "out of memory in " __FILE__, 0);
      return TCL_ERROR;
    }
  }
  rc = sqlite3_blob_read(pBlob, zBuf, nByte, iOffset);
  if( rc==SQLITE_OK ){
    Tcl_SetObjResult(interp, Tcl_NewByteArrayObj(zBuf, nByte));
  }else{
    Tcl_SetResult(interp, (char *)sqlite3ErrName(rc), TCL_VOLATILE);
  }
  Tcl_Free((char *)zBuf);

  return (rc==SQLITE_OK ? TCL_OK : TCL_ERROR);
}

/*
** sqlite3_blob_write HANDLE OFFSET DATA ?NDATA?
**
**   This command is used to test the sqlite3_blob_write() in ways that
**   the Tcl channel interface does not. The first argument should
**   be the name of a valid channel created by the [incrblob] method
**   of a database handle. This function calls sqlite3_blob_write()
**   to write the DATA byte-array to the underlying SQLite blob handle.
**   at offset OFFSET.
**
**   On success, an empty string is returned. On failure, the interpreter
**   result is set to the text representation of the returned error code 
**   (i.e. "SQLITE_NOMEM") and a Tcl exception is thrown.
*/
static int SQLITE_TCLAPI test_blob_write(
  ClientData clientData, /* Not used */
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int objc,              /* Number of arguments */
  Tcl_Obj *CONST objv[]  /* Command arguments */
){
  sqlite3_blob *pBlob;
  int iOffset;
  int rc;

  unsigned char *zBuf;
  int nBuf;
  
  if( objc!=4 && objc!=5 ){
    Tcl_WrongNumArgs(interp, 1, objv, "HANDLE OFFSET DATA ?NDATA?");
    return TCL_ERROR;
  }

  if( blobHandleFromObj(interp, objv[1], &pBlob) ) return TCL_ERROR;
  if( TCL_OK!=Tcl_GetIntFromObj(interp, objv[2], &iOffset) ){ 
    return TCL_ERROR;
  }

  zBuf = Tcl_GetByteArrayFromObj(objv[3], &nBuf);
  if( objc==5 && Tcl_GetIntFromObj(interp, objv[4], &nBuf) ){
    return TCL_ERROR;
  }
  rc = sqlite3_blob_write(pBlob, zBuf, nBuf, iOffset);
  if( rc!=SQLITE_OK ){
    Tcl_SetResult(interp, (char *)sqlite3ErrName(rc), TCL_VOLATILE);
  }

  return (rc==SQLITE_OK ? TCL_OK : TCL_ERROR);
}
#endif /* SQLITE_OMIT_INCRBLOB */

/*
** Register commands with the TCL interpreter.
*/
int Sqlitetest_blob_Init(Tcl_Interp *interp){
#ifndef SQLITE_OMIT_INCRBLOB
  static struct {
     char *zName;
     Tcl_ObjCmdProc *xProc;
  } aObjCmd[] = {
     { "sqlite3_blob_open",            test_blob_open        },
     { "sqlite3_blob_close",           test_blob_close       },
     { "sqlite3_blob_bytes",           test_blob_bytes       },
     { "sqlite3_blob_read",            test_blob_read        },
     { "sqlite3_blob_write",           test_blob_write       },
  };
  int i;
  for(i=0; i<sizeof(aObjCmd)/sizeof(aObjCmd[0]); i++){
    Tcl_CreateObjCommand(interp, aObjCmd[i].zName, aObjCmd[i].xProc, 0, 0);
  }
#endif /* SQLITE_OMIT_INCRBLOB */
  return TCL_OK;
}
