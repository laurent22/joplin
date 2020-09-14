/*
** 2017-08-10
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
** This file implements a virtual table that prints diagnostic information
** on stdout when its key interfaces are called.  This is intended for
** interactive analysis and debugging of virtual table interfaces.
**
** Usage example:
**
**     .load ./vtablog
**     CREATE VIRTUAL TABLE temp.log USING vtablog(
**        schema='CREATE TABLE x(a,b,c)',
**        rows=25
**     );
**     SELECT * FROM log;
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <string.h>
#include <ctype.h>


/* vtablog_vtab is a subclass of sqlite3_vtab which will
** serve as the underlying representation of a vtablog virtual table
*/
typedef struct vtablog_vtab vtablog_vtab;
struct vtablog_vtab {
  sqlite3_vtab base;  /* Base class - must be first */
  int nRow;           /* Number of rows in the table */
  int iInst;          /* Instance number for this vtablog table */
  int nCursor;        /* Number of cursors created */
};

/* vtablog_cursor is a subclass of sqlite3_vtab_cursor which will
** serve as the underlying representation of a cursor that scans
** over rows of the result
*/
typedef struct vtablog_cursor vtablog_cursor;
struct vtablog_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  int iCursor;               /* Cursor number */
  sqlite3_int64 iRowid;      /* The rowid */
};

/* Skip leading whitespace.  Return a pointer to the first non-whitespace
** character, or to the zero terminator if the string has only whitespace */
static const char *vtablog_skip_whitespace(const char *z){
  while( isspace((unsigned char)z[0]) ) z++;
  return z;
}

/* Remove trailing whitespace from the end of string z[] */
static void vtablog_trim_whitespace(char *z){
  size_t n = strlen(z);
  while( n>0 && isspace((unsigned char)z[n]) ) n--;
  z[n] = 0;
}

/* Dequote the string */
static void vtablog_dequote(char *z){
  int j;
  char cQuote = z[0];
  size_t i, n;

  if( cQuote!='\'' && cQuote!='"' ) return;
  n = strlen(z);
  if( n<2 || z[n-1]!=z[0] ) return;
  for(i=1, j=0; i<n-1; i++){
    if( z[i]==cQuote && z[i+1]==cQuote ) i++;
    z[j++] = z[i];
  }
  z[j] = 0;
}

/* Check to see if the string is of the form:  "TAG = VALUE" with optional
** whitespace before and around tokens.  If it is, return a pointer to the
** first character of VALUE.  If it is not, return NULL.
*/
static const char *vtablog_parameter(const char *zTag, int nTag, const char *z){
  z = vtablog_skip_whitespace(z);
  if( strncmp(zTag, z, nTag)!=0 ) return 0;
  z = vtablog_skip_whitespace(z+nTag);
  if( z[0]!='=' ) return 0;
  return vtablog_skip_whitespace(z+1);
}

/* Decode a parameter that requires a dequoted string.
**
** Return non-zero on an error.
*/
static int vtablog_string_parameter(
  char **pzErr,            /* Leave the error message here, if there is one */
  const char *zParam,      /* Parameter we are checking for */
  const char *zArg,        /* Raw text of the virtual table argment */
  char **pzVal             /* Write the dequoted string value here */
){
  const char *zValue;
  zValue = vtablog_parameter(zParam,(int)strlen(zParam),zArg);
  if( zValue==0 ) return 0;
  if( *pzVal ){
    *pzErr = sqlite3_mprintf("more than one '%s' parameter", zParam);
    return 1;
  }
  *pzVal = sqlite3_mprintf("%s", zValue);
  if( *pzVal==0 ){
    *pzErr = sqlite3_mprintf("out of memory");
    return 1;
  }
  vtablog_trim_whitespace(*pzVal);
  vtablog_dequote(*pzVal);
  return 0;
}

#if 0 /* not used - yet */
/* Return 0 if the argument is false and 1 if it is true.  Return -1 if
** we cannot really tell.
*/
static int vtablog_boolean(const char *z){
  if( sqlite3_stricmp("yes",z)==0
   || sqlite3_stricmp("on",z)==0
   || sqlite3_stricmp("true",z)==0
   || (z[0]=='1' && z[1]==0)
  ){
    return 1;
  }
  if( sqlite3_stricmp("no",z)==0
   || sqlite3_stricmp("off",z)==0
   || sqlite3_stricmp("false",z)==0
   || (z[0]=='0' && z[1]==0)
  ){
    return 0;
  }
  return -1;
}
#endif

/*
** The vtablogConnect() method is invoked to create a new
** vtablog_vtab that describes the vtablog virtual table.
**
** Think of this routine as the constructor for vtablog_vtab objects.
**
** All this routine needs to do is:
**
**    (1) Allocate the vtablog_vtab object and initialize all fields.
**
**    (2) Tell SQLite (via the sqlite3_declare_vtab() interface) what the
**        result set of queries against vtablog will look like.
*/
static int vtablogConnectCreate(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr,
  int isCreate
){
  static int nInst = 0;
  vtablog_vtab *pNew;
  int i;
  int rc;
  int iInst = ++nInst;
  char *zSchema = 0;
  char *zNRow = 0;

  printf("vtablog%s(tab=%d):\n", isCreate ? "Create" : "Connect", iInst);
  printf("  argc=%d\n", argc);
  for(i=0; i<argc; i++){
    printf("  argv[%d] = ", i);
    if( argv[i] ){
      printf("[%s]\n", argv[i]);
    }else{
      printf("NULL\n");
    }
  }

  for(i=3; i<argc; i++){
    const char *z = argv[i];
    if( vtablog_string_parameter(pzErr, "schema", z, &zSchema) ){
      return SQLITE_ERROR;
    }
    if( vtablog_string_parameter(pzErr, "rows", z, &zNRow) ){
      return SQLITE_ERROR;
    }
  }

  if( zSchema==0 ){
    *pzErr = sqlite3_mprintf("no schema defined");
    return SQLITE_ERROR;
  }
  rc = sqlite3_declare_vtab(db, zSchema);
  if( rc==SQLITE_OK ){
    pNew = sqlite3_malloc( sizeof(*pNew) );
    *ppVtab = (sqlite3_vtab*)pNew;
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
    pNew->nRow = 10;
    if( zNRow ) pNew->nRow = atoi(zNRow);
    pNew->iInst = iInst;
  }
  return rc;
}
static int vtablogCreate(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  return vtablogConnectCreate(db,pAux,argc,argv,ppVtab,pzErr,1);
}
static int vtablogConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  return vtablogConnectCreate(db,pAux,argc,argv,ppVtab,pzErr,0);
}


/*
** This method is the destructor for vtablog_cursor objects.
*/
static int vtablogDisconnect(sqlite3_vtab *pVtab){
  vtablog_vtab *pTab = (vtablog_vtab*)pVtab;
  printf("vtablogDisconnect(%d)\n", pTab->iInst);
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** This method is the destructor for vtablog_cursor objects.
*/
static int vtablogDestroy(sqlite3_vtab *pVtab){
  vtablog_vtab *pTab = (vtablog_vtab*)pVtab;
  printf("vtablogDestroy(%d)\n", pTab->iInst);
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new vtablog_cursor object.
*/
static int vtablogOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  vtablog_vtab *pTab = (vtablog_vtab*)p;
  vtablog_cursor *pCur;
  printf("vtablogOpen(tab=%d, cursor=%d)\n", pTab->iInst, ++pTab->nCursor);
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->iCursor = pTab->nCursor;
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Destructor for a vtablog_cursor.
*/
static int vtablogClose(sqlite3_vtab_cursor *cur){
  vtablog_cursor *pCur = (vtablog_cursor*)cur;
  vtablog_vtab *pTab = (vtablog_vtab*)cur->pVtab;
  printf("vtablogClose(tab=%d, cursor=%d)\n", pTab->iInst, pCur->iCursor);
  sqlite3_free(cur);
  return SQLITE_OK;
}


/*
** Advance a vtablog_cursor to its next row of output.
*/
static int vtablogNext(sqlite3_vtab_cursor *cur){
  vtablog_cursor *pCur = (vtablog_cursor*)cur;
  vtablog_vtab *pTab = (vtablog_vtab*)cur->pVtab;
  printf("vtablogNext(tab=%d, cursor=%d)  rowid %d -> %d\n", 
         pTab->iInst, pCur->iCursor, (int)pCur->iRowid, (int)pCur->iRowid+1);
  pCur->iRowid++;
  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the vtablog_cursor
** is currently pointing.
*/
static int vtablogColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  vtablog_cursor *pCur = (vtablog_cursor*)cur;
  vtablog_vtab *pTab = (vtablog_vtab*)cur->pVtab;
  char zVal[50];

  if( i<26 ){
    sqlite3_snprintf(sizeof(zVal),zVal,"%c%d", 
                     "abcdefghijklmnopqrstuvwyz"[i], pCur->iRowid);
  }else{
    sqlite3_snprintf(sizeof(zVal),zVal,"{%d}%d", i, pCur->iRowid);
  }
  printf("vtablogColumn(tab=%d, cursor=%d, i=%d): [%s]\n",
         pTab->iInst, pCur->iCursor, i, zVal);
  sqlite3_result_text(ctx, zVal, -1, SQLITE_TRANSIENT);
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.  In this implementation, the
** rowid is the same as the output value.
*/
static int vtablogRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  vtablog_cursor *pCur = (vtablog_cursor*)cur;
  vtablog_vtab *pTab = (vtablog_vtab*)cur->pVtab;
  printf("vtablogRowid(tab=%d, cursor=%d): %d\n",
         pTab->iInst, pCur->iCursor, (int)pCur->iRowid);
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int vtablogEof(sqlite3_vtab_cursor *cur){
  vtablog_cursor *pCur = (vtablog_cursor*)cur;
  vtablog_vtab *pTab = (vtablog_vtab*)cur->pVtab;
  int rc = pCur->iRowid >= pTab->nRow;
  printf("vtablogEof(tab=%d, cursor=%d): %d\n",
         pTab->iInst, pCur->iCursor, rc);
  return rc;
}

/*
** Output an sqlite3_value object's value as an SQL literal.
*/
static void vtablogQuote(sqlite3_value *p){
  char z[50];
  switch( sqlite3_value_type(p) ){
    case SQLITE_NULL: {
      printf("NULL");
      break;
    }
    case SQLITE_INTEGER: {
      sqlite3_snprintf(50,z,"%lld", sqlite3_value_int64(p));
      printf("%s", z);
      break;
    }
    case SQLITE_FLOAT: {
      sqlite3_snprintf(50,z,"%!.20g", sqlite3_value_double(p));
      printf("%s", z);
      break;
    }
    case SQLITE_BLOB: {
      int n = sqlite3_value_bytes(p);
      const unsigned char *z = (const unsigned char*)sqlite3_value_blob(p);
      int i;
      printf("x'");
      for(i=0; i<n; i++) printf("%02x", z[i]);
      printf("'");
      break;
    }
    case SQLITE_TEXT: {
      const char *z = (const char*)sqlite3_value_text(p);
      int i;
      char c;
      for(i=0; (c = z[i])!=0 && c!='\''; i++){}
      if( c==0 ){
        printf("'%s'",z);
      }else{
        printf("'");
        while( *z ){
          for(i=0; (c = z[i])!=0 && c!='\''; i++){}
          if( c=='\'' ) i++;
          if( i ){
            printf("%.*s", i, z);
            z += i;
          }
          if( c=='\'' ){
            printf("'");
            continue;
          }
          if( c==0 ){
            break;
          }
          z++;
        }
        printf("'");
      }
      break;
    }
  }
}


/*
** This method is called to "rewind" the vtablog_cursor object back
** to the first row of output.  This method is always called at least
** once prior to any call to vtablogColumn() or vtablogRowid() or 
** vtablogEof().
*/
static int vtablogFilter(
  sqlite3_vtab_cursor *cur,
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  vtablog_cursor *pCur = (vtablog_cursor *)cur;
  vtablog_vtab *pTab = (vtablog_vtab*)cur->pVtab;
  printf("vtablogFilter(tab=%d, cursor=%d):\n", pTab->iInst, pCur->iCursor);
  pCur->iRowid = 0;
  return SQLITE_OK;
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the vtablog virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
*/
static int vtablogBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  vtablog_vtab *pTab = (vtablog_vtab*)tab;
  printf("vtablogBestIndex(tab=%d):\n", pTab->iInst);
  pIdxInfo->estimatedCost = (double)500;
  pIdxInfo->estimatedRows = 500;
  return SQLITE_OK;
}

/*
** SQLite invokes this method to INSERT, UPDATE, or DELETE content from
** the table. 
**
** This implementation does not actually make any changes to the table
** content.  It merely logs the fact that the method was invoked
*/
static int vtablogUpdate(
  sqlite3_vtab *tab,
  int argc,
  sqlite3_value **argv,
  sqlite_int64 *pRowid
){
  vtablog_vtab *pTab = (vtablog_vtab*)tab;
  int i;
  printf("vtablogUpdate(tab=%d):\n", pTab->iInst);
  printf("  argc=%d\n", argc);
  for(i=0; i<argc; i++){
    printf("  argv[%d]=", i);
    vtablogQuote(argv[i]);
    printf("\n");
  }
  return SQLITE_OK;
}

/*
** This following structure defines all the methods for the 
** vtablog virtual table.
*/
static sqlite3_module vtablogModule = {
  0,                         /* iVersion */
  vtablogCreate,             /* xCreate */
  vtablogConnect,            /* xConnect */
  vtablogBestIndex,          /* xBestIndex */
  vtablogDisconnect,         /* xDisconnect */
  vtablogDestroy,            /* xDestroy */
  vtablogOpen,               /* xOpen - open a cursor */
  vtablogClose,              /* xClose - close a cursor */
  vtablogFilter,             /* xFilter - configure scan constraints */
  vtablogNext,               /* xNext - advance a cursor */
  vtablogEof,                /* xEof - check for end of scan */
  vtablogColumn,             /* xColumn - read data */
  vtablogRowid,              /* xRowid - read data */
  vtablogUpdate,             /* xUpdate */
  0,                         /* xBegin */
  0,                         /* xSync */
  0,                         /* xCommit */
  0,                         /* xRollback */
  0,                         /* xFindMethod */
  0,                         /* xRename */
  0,                         /* xSavepoint */
  0,                         /* xRelease */
  0,                         /* xRollbackTo */
  0,                         /* xShadowName */
};

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_vtablog_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc;
  SQLITE_EXTENSION_INIT2(pApi);
  rc = sqlite3_create_module(db, "vtablog", &vtablogModule, 0);
  return rc;
}
