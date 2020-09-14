/*
** Performance test for SQLite.
**
** This program reads ASCII text from a file named on the command-line
** and submits that text  to SQLite for evaluation.  A new database
** is created at the beginning of the program.  All statements are
** timed using the high-resolution timer built into Intel-class processors.
**
** To compile this program, first compile the SQLite library separately
** will full optimizations.  For example:
**
**     gcc -c -O6 -DSQLITE_THREADSAFE=0 sqlite3.c
**
** Then link against this program.  But to do optimize this program
** because that defeats the hi-res timer.
**
**     gcc speedtest8.c sqlite3.o -ldl -I../src
**
** Then run this program with a single argument which is the name of
** a file containing SQL script that you want to test:
**
**     ./a.out test.db  test.sql
*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include <unistd.h>
#include <stdarg.h>
#include "sqlite3.h"

#define ISSPACE(X)  isspace((unsigned char)(X))

#include "test_osinst.c"

/*
** Prepare and run a single statement of SQL.
*/
static void prepareAndRun(sqlite3_vfs *pInstVfs, sqlite3 *db, const char *zSql){
  sqlite3_stmt *pStmt;
  const char *stmtTail;
  int rc;
  char zMessage[1024];
  zMessage[1023] = '\0';

  sqlite3_uint64 iTime;

  sqlite3_snprintf(1023, zMessage, "sqlite3_prepare_v2: %s", zSql);
  sqlite3_instvfs_binarylog_marker(pInstVfs, zMessage);

  iTime = sqlite3Hwtime();
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, &stmtTail);
  iTime = sqlite3Hwtime() - iTime;
  sqlite3_instvfs_binarylog_call(pInstVfs,BINARYLOG_PREPARE_V2,iTime,rc,zSql);

  if( rc==SQLITE_OK ){
    int nRow = 0;

    sqlite3_snprintf(1023, zMessage, "sqlite3_step loop: %s", zSql);
    sqlite3_instvfs_binarylog_marker(pInstVfs, zMessage);
    iTime = sqlite3Hwtime();
    while( (rc=sqlite3_step(pStmt))==SQLITE_ROW ){ nRow++; }
    iTime = sqlite3Hwtime() - iTime;
    sqlite3_instvfs_binarylog_call(pInstVfs, BINARYLOG_STEP, iTime, rc, zSql);

    sqlite3_snprintf(1023, zMessage, "sqlite3_finalize: %s", zSql);
    sqlite3_instvfs_binarylog_marker(pInstVfs, zMessage);
    iTime = sqlite3Hwtime();
    rc = sqlite3_finalize(pStmt);
    iTime = sqlite3Hwtime() - iTime;
    sqlite3_instvfs_binarylog_call(pInstVfs, BINARYLOG_FINALIZE, iTime, rc, zSql);
  }
}

static int stringcompare(const char *zLeft, const char *zRight){
  int ii;
  for(ii=0; zLeft[ii] && zRight[ii]; ii++){
    if( zLeft[ii]!=zRight[ii] ) return 0;
  }
  return( zLeft[ii]==zRight[ii] );
}

static char *readScriptFile(const char *zFile, int *pnScript){
  sqlite3_vfs *pVfs = sqlite3_vfs_find(0);
  sqlite3_file *p;
  int rc;
  sqlite3_int64 nByte;
  char *zData = 0;
  int flags = SQLITE_OPEN_READONLY|SQLITE_OPEN_MAIN_DB;

  p = (sqlite3_file *)malloc(pVfs->szOsFile);
  rc = pVfs->xOpen(pVfs, zFile, p, flags, &flags);
  if( rc!=SQLITE_OK ){
    goto error_out;
  }

  rc = p->pMethods->xFileSize(p, &nByte);
  if( rc!=SQLITE_OK ){
    goto close_out;
  }

  zData = (char *)malloc(nByte+1);
  rc = p->pMethods->xRead(p, zData, nByte, 0);
  if( rc!=SQLITE_OK ){
    goto close_out;
  }
  zData[nByte] = '\0';

  p->pMethods->xClose(p);
  free(p);
  *pnScript = nByte;
  return zData;

close_out:
  p->pMethods->xClose(p);

error_out:
  free(p);
  free(zData);
  return 0;
}

int main(int argc, char **argv){

  const char zUsageMsg[] = 
    "Usage: %s options...\n"
    "  where available options are:\n"
    "\n"
    "    -db      DATABASE-FILE  (database file to operate on)\n"
    "    -script  SCRIPT-FILE    (script file to read sql from)\n"
    "    -log     LOG-FILE       (log file to create)\n"
    "    -logdata                (log all data to log file)\n"
    "\n"
    "  Options -db, -script and -log are compulsory\n"
    "\n"
  ;

  const char *zDb = 0;
  const char *zScript = 0;
  const char *zLog = 0;
  int logdata = 0;

  int ii;
  int i, j;
  int rc;

  sqlite3_vfs *pInstVfs;                 /* Instrumentation VFS */

  char *zSql = 0;
  int nSql;

  sqlite3 *db;

  for(ii=1; ii<argc; ii++){
    if( stringcompare("-db", argv[ii]) && (ii+1)<argc ){
      zDb = argv[++ii];
    }

    else if( stringcompare("-script", argv[ii]) && (ii+1)<argc ){
      zScript = argv[++ii];
    }

    else if( stringcompare("-log", argv[ii]) && (ii+1)<argc ){
      zLog = argv[++ii];
    }

    else if( stringcompare("-logdata", argv[ii]) ){
      logdata = 1;
    }

    else {
      goto usage;
    }
  }
  if( !zDb || !zScript || !zLog ) goto usage;

  zSql = readScriptFile(zScript, &nSql);
  if( !zSql ){
    fprintf(stderr, "Failed to read script file\n");
    return -1;
  }

  pInstVfs = sqlite3_instvfs_binarylog("logging", 0, zLog, logdata);

  rc = sqlite3_open_v2(
     zDb, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, "logging"
  );
  if( rc!=SQLITE_OK ){
    fprintf(stderr, "Failed to open db: %s\n", sqlite3_errmsg(db));
    return -2;
  }

  for(i=j=0; j<nSql; j++){
    if( zSql[j]==';' ){
      int isComplete;
      char c = zSql[j+1];
      zSql[j+1] = 0;
      isComplete = sqlite3_complete(&zSql[i]);
      zSql[j+1] = c;
      if( isComplete ){
        zSql[j] = 0;
        while( i<j && ISSPACE(zSql[i]) ){ i++; }
        if( i<j ){
          prepareAndRun(pInstVfs, db, &zSql[i]);
        }
        zSql[j] = ';';
        i = j+1;
      }
    }
  }
  
  sqlite3_instvfs_destroy(pInstVfs);
  return 0;
  
usage:
  fprintf(stderr, zUsageMsg, argv[0]);
  return -3;
}
