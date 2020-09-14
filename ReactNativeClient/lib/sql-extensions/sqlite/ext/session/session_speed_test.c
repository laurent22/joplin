/*
** 2017 January 31
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains the source code for a standalone program used to
** test the performance of the sessions module. Compile and run:
**
**   ./session_speed_test -help
**
** for details.
*/

#include "sqlite3.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <unistd.h>

/*************************************************************************
** Start of generic command line parser.
*/
#define CMDLINE_BARE       0
#define CMDLINE_INTEGER    1
#define CMDLINE_STRING     2
#define CMDLINE_BOOLEAN    3

typedef struct CmdLineOption CmdLineOption;
struct CmdLineOption {
  const char *zText;              /* Name of command line option */
  const char *zHelp;              /* Help text for option */
  int eType;                      /* One of the CMDLINE_* values */
  int iOff;                       /* Offset of output variable */
};

#define CMDLINE_INT32(x,y,z) {x, y, CMDLINE_INTEGER, z}
#define CMDLINE_BOOL(x,y,z)  {x, y, CMDLINE_BOOLEAN, z}
#define CMDLINE_TEXT(x,y,z)  {x, y, CMDLINE_STRING, z}
#define CMDLINE_NONE(x,y,z)  {x, y, CMDLINE_BARE, z}

static void option_requires_argument_error(CmdLineOption *pOpt){
  fprintf(stderr, "Option requires a%s argument: %s\n", 
      pOpt->eType==CMDLINE_INTEGER ? "n integer" :
      pOpt->eType==CMDLINE_STRING ? " string" : " boolean",
      pOpt->zText
  );
  exit(1);
}

static void ambiguous_option_error(const char *zArg){
  fprintf(stderr, "Option is ambiguous: %s\n", zArg);
  exit(1);
}

static void unknown_option_error(
  const char *zArg, 
  CmdLineOption *aOpt,
  const char *zHelp
){
  int i;
  fprintf(stderr, "Unknown option: %s\n", zArg);
  fprintf(stderr, "\nOptions are:\n");
  fprintf(stderr, "  % -30sEcho command line options\n", "-cmdline:verbose");
  for(i=0; aOpt[i].zText; i++){
    int eType = aOpt[i].eType;
    char *zOpt = sqlite3_mprintf("%s %s", aOpt[i].zText,
        eType==CMDLINE_BARE ? "" :
        eType==CMDLINE_INTEGER ? "N" :
        eType==CMDLINE_BOOLEAN ? "BOOLEAN" : "TEXT"
    );
    fprintf(stderr, "  % -30s%s\n", zOpt, aOpt[i].zHelp);
    sqlite3_free(zOpt);
  }
  if( zHelp ){
    fprintf(stderr, "\n%s\n", zHelp);
  }
  exit(1);
}

static int get_integer_option(CmdLineOption *pOpt, const char *zArg){
  int i = 0;
  int iRet = 0;
  int bSign = 1;
  if( zArg[0]=='-' ){
    bSign = -1;
    i = 1;
  }
  while( zArg[i] ){
    if( zArg[i]<'0' || zArg[i]>'9' ) option_requires_argument_error(pOpt);
    iRet = iRet*10 + (zArg[i] - '0');
    i++;
  }
  return (iRet*bSign);
}

static int get_boolean_option(CmdLineOption *pOpt, const char *zArg){
  if( 0==sqlite3_stricmp(zArg, "true") ) return 1;
  if( 0==sqlite3_stricmp(zArg, "1") ) return 1;
  if( 0==sqlite3_stricmp(zArg, "0") ) return 0;
  if( 0==sqlite3_stricmp(zArg, "false") ) return 0;
  option_requires_argument_error(pOpt);
  return 0;
}

static void parse_command_line(
  int argc, 
  char **argv, 
  int iStart,
  CmdLineOption *aOpt,
  void *pStruct,
  const char *zHelp
){
  char *pOut = (char*)pStruct;
  int bVerbose = 0;
  int iArg;

  for(iArg=iStart; iArg<argc; iArg++){
    const char *zArg = argv[iArg];
    int nArg = strlen(zArg);
    int nMatch = 0;
    int iOpt;

    for(iOpt=0; aOpt[iOpt].zText; iOpt++){
      CmdLineOption *pOpt = &aOpt[iOpt];
      if( 0==sqlite3_strnicmp(pOpt->zText, zArg, nArg) ){
        if( nMatch ){
          ambiguous_option_error(zArg);
        }
        nMatch++;
        if( pOpt->eType==CMDLINE_BARE ){
          *(int*)(&pOut[pOpt->iOff]) = 1;
        }else{
          iArg++;
          if( iArg==argc ){
            option_requires_argument_error(pOpt);
          }
          switch( pOpt->eType ){
            case CMDLINE_INTEGER:
              *(int*)(&pOut[pOpt->iOff]) = get_integer_option(pOpt, argv[iArg]);
              break;
            case CMDLINE_STRING:
              *(const char**)(&pOut[pOpt->iOff]) = argv[iArg];
              break;
            case CMDLINE_BOOLEAN:
              *(int*)(&pOut[pOpt->iOff]) = get_boolean_option(pOpt, argv[iArg]);
              break;
          }
        }
      }
    }

    if( nMatch==0 && 0==sqlite3_strnicmp("-cmdline:verbose", zArg, nArg) ){
      bVerbose = 1;
      nMatch = 1;
    }

    if( nMatch==0 ){
      unknown_option_error(zArg, aOpt, zHelp);
    }
  }

  if( bVerbose ){
    int iOpt;
    fprintf(stdout, "Options are: ");
    for(iOpt=0; aOpt[iOpt].zText; iOpt++){
      CmdLineOption *pOpt = &aOpt[iOpt];
      if( pOpt->eType!=CMDLINE_BARE || *(int*)(&pOut[pOpt->iOff]) ){
        fprintf(stdout, "%s ", pOpt->zText);
      }
      switch( pOpt->eType ){
        case CMDLINE_INTEGER:
          fprintf(stdout, "%d ", *(int*)(&pOut[pOpt->iOff]));
          break;
        case CMDLINE_BOOLEAN:
          fprintf(stdout, "%d ", *(int*)(&pOut[pOpt->iOff]));
          break;
        case CMDLINE_STRING:
          fprintf(stdout, "%s ", *(const char**)(&pOut[pOpt->iOff]));
          break;
      }
    }
    fprintf(stdout, "\n");
  }
}
/* 
** End of generic command line parser.
*************************************************************************/

static void abort_due_to_error(int rc){
  fprintf(stderr, "Error: %d\n");
  exit(-1);
}

static void execsql(sqlite3 *db, const char *zSql){
  int rc = sqlite3_exec(db, zSql, 0, 0, 0);
  if( rc!=SQLITE_OK ) abort_due_to_error(rc);
}

static int xConflict(void *pCtx, int eConflict, sqlite3_changeset_iter *p){
  return SQLITE_CHANGESET_ABORT;
}

static void run_test(
  sqlite3 *db, 
  sqlite3 *db2, 
  int nRow, 
  const char *zSql
){
  sqlite3_session *pSession = 0;
  sqlite3_stmt *pStmt = 0;
  int rc;
  int i;
  int nChangeset;
  void *pChangeset;

  /* Attach a session object to database db */
  rc = sqlite3session_create(db, "main", &pSession);
  if( rc!=SQLITE_OK ) abort_due_to_error(rc);

  /* Configure the session to capture changes on all tables */
  rc = sqlite3session_attach(pSession, 0);
  if( rc!=SQLITE_OK ) abort_due_to_error(rc);

  /* Prepare the SQL statement */
  rc = sqlite3_prepare(db, zSql, -1, &pStmt, 0);
  if( rc!=SQLITE_OK ) abort_due_to_error(rc);

  /* Open a transaction */
  execsql(db, "BEGIN");

  /* Execute the SQL statement nRow times */
  for(i=0; i<nRow; i++){
    sqlite3_bind_int(pStmt, 1, i);
    sqlite3_step(pStmt);
    rc = sqlite3_reset(pStmt);
    if( rc!=SQLITE_OK ) abort_due_to_error(rc);
  }
  sqlite3_finalize(pStmt);

  /* Extract a changeset from the sessions object */
  rc = sqlite3session_changeset(pSession, &nChangeset, &pChangeset);
  if( rc!=SQLITE_OK ) abort_due_to_error(rc);
  execsql(db, "COMMIT");

  /* Apply the changeset to the second db */
  rc = sqlite3changeset_apply(db2, nChangeset, pChangeset, 0, xConflict, 0);
  if( rc!=SQLITE_OK ) abort_due_to_error(rc);

  /* Cleanup */
  sqlite3_free(pChangeset);
  sqlite3session_delete(pSession);
}

int main(int argc, char **argv){
  struct Options {
    int nRow;
    int bWithoutRowid;
    int bInteger;
    int bAll;
    const char *zDb;
  };
  struct Options o = { 2500, 0, 0, 0, "session_speed_test.db" };

  CmdLineOption aOpt[] = {
    CMDLINE_INT32( "-rows", "number of rows in test",
      offsetof(struct Options, nRow) ),
    CMDLINE_BOOL("-without-rowid", "use WITHOUT ROWID tables", 
      offsetof(struct Options, bWithoutRowid) ),
    CMDLINE_BOOL("-integer", "use integer data (instead of text/blobs)",
      offsetof(struct Options, bInteger) ),
    CMDLINE_NONE("-all", "Run all 4 combos of -without-rowid and -integer",
      offsetof(struct Options, bAll) ),
    CMDLINE_TEXT("-database", "prefix for database files to use",
      offsetof(struct Options, zDb) ),
    {0, 0, 0, 0}
  };

  const char *azCreate[] = {
    "CREATE TABLE t1(a PRIMARY KEY, b, c, d)",
    "CREATE TABLE t1(a PRIMARY KEY, b, c, d) WITHOUT ROWID",
  };

  const char *azInsert[] = {
    "INSERT INTO t1 VALUES("
    "printf('%.8d',?), randomblob(50), randomblob(50), randomblob(50))",
    "INSERT INTO t1 VALUES(?, random(), random(), random())"
  };

  const char *azUpdate[] = {
    "UPDATE t1 SET d = randomblob(50) WHERE a = printf('%.8d',?)",
    "UPDATE t1 SET d = random() WHERE a = ?"
  };

  const char *azDelete[] = {
    "DELETE FROM t1 WHERE a = printf('%.8d',?)",
    "DELETE FROM t1 WHERE a = ?"
  };

  int rc;
  sqlite3 *db;
  sqlite3 *db2;
  char *zDb2;
  int bWithoutRowid;
  int bInteger;

  parse_command_line(argc, argv, 1, aOpt, (void*)&o,
    "This program creates two new, empty, databases each containing a single\n"
    "table. It then does the following:\n\n"
    "  1. Inserts -rows rows into the first database\n"
    "  2. Updates each row in the first db\n"
    "  3. Delete each row from the first db\n\n"
    "The modifications made by each step are captured in a changeset and\n"
    "applied to the second database.\n"
  );
  zDb2 = sqlite3_mprintf("%s2", o.zDb);

  for(bWithoutRowid=0; bWithoutRowid<2; bWithoutRowid++){
    for(bInteger=0; bInteger<2; bInteger++){
      if( o.bAll || (o.bWithoutRowid==bWithoutRowid && o.bInteger==bInteger) ){
        fprintf(stdout, "Testing %s data with %s table\n",
            bInteger ? "integer" : "blob/text",
            bWithoutRowid ? "WITHOUT ROWID" : "rowid"
        );

        /* Open new database handles on two empty databases */
        unlink(o.zDb);
        rc = sqlite3_open(o.zDb, &db);
        if( rc!=SQLITE_OK ) abort_due_to_error(rc);
        unlink(zDb2);
        rc = sqlite3_open(zDb2, &db2);
        if( rc!=SQLITE_OK ) abort_due_to_error(rc);

        /* Create the schema in both databases. */
        execsql(db, azCreate[o.bWithoutRowid]);
        execsql(db2, azCreate[o.bWithoutRowid]);

        /* Run the three tests */
        run_test(db, db2, o.nRow, azInsert[o.bInteger]);
        run_test(db, db2, o.nRow, azUpdate[o.bInteger]);
        run_test(db, db2, o.nRow, azDelete[o.bInteger]);

        /* Close the db handles */
        sqlite3_close(db);
        sqlite3_close(db2);
      }
    }
  }


  return 0;
}
