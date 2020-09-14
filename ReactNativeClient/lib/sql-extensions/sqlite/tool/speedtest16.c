/*
** Performance test for SQLite.
**
** This program reads ASCII text from a file named on the command-line.
** It converts each SQL statement into UTF16 and submits it to SQLite
** for evaluation.  A new UTF16 database is created at the beginning of
** the program.  All statements are timed using the high-resolution timer
** built into Intel-class processors.
**
** To compile this program, first compile the SQLite library separately
** will full optimizations.  For example:
**
**     gcc -c -O6 -DSQLITE_THREADSAFE=0 sqlite3.c
**
** Then link against this program.  But to do optimize this program
** because that defeats the hi-res timer.
**
**     gcc speedtest16.c sqlite3.o -ldl -I../src
**
** Then run this program with a single argument which is the name of
** a file containing SQL script that you want to test:
**
**     ./a.out database.db test.sql
*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include <unistd.h>
#include "sqlite3.h"

#define ISSPACE(X)  isspace((unsigned char)(X))

/* 
** hwtime.h contains inline assembler code for implementing 
** high-performance timing routines.
*/
#include "hwtime.h"

/*
** Convert a zero-terminated ASCII string into a zero-terminated
** UTF-16le string.  Memory to hold the returned string comes 
** from malloc() and should be freed by the caller.
*/
static void *asciiToUtf16le(const char *z){
  int n = strlen(z);
  char *z16;
  int i, j;

  z16 = malloc( n*2 + 2 );
  for(i=j=0; i<=n; i++){
    z16[j++] = z[i];
    z16[j++] = 0;
  }
  return (void*)z16;
}

/*
** Timers
*/
static sqlite_uint64 prepTime = 0;
static sqlite_uint64 runTime = 0;
static sqlite_uint64 finalizeTime = 0;

/*
** Prepare and run a single statement of SQL.
*/
static void prepareAndRun(sqlite3 *db, const char *zSql){
  void *utf16;
  sqlite3_stmt *pStmt;
  const void *stmtTail;
  sqlite_uint64 iStart, iElapse;
  int rc;
  
  printf("****************************************************************\n");
  printf("SQL statement: [%s]\n", zSql);
  utf16 = asciiToUtf16le(zSql);
  iStart = sqlite3Hwtime();
  rc = sqlite3_prepare16_v2(db, utf16, -1, &pStmt, &stmtTail);
  iElapse = sqlite3Hwtime() - iStart;
  prepTime += iElapse;
  printf("sqlite3_prepare16_v2() returns %d in %llu cycles\n", rc, iElapse);
  if( rc==SQLITE_OK ){
    int nRow = 0;
    iStart = sqlite3Hwtime();
    while( (rc=sqlite3_step(pStmt))==SQLITE_ROW ){ nRow++; }
    iElapse = sqlite3Hwtime() - iStart;
    runTime += iElapse;
    printf("sqlite3_step() returns %d after %d rows in %llu cycles\n",
           rc, nRow, iElapse);
    iStart = sqlite3Hwtime();
    rc = sqlite3_finalize(pStmt);
    iElapse = sqlite3Hwtime() - iStart;
    finalizeTime += iElapse;
    printf("sqlite3_finalize() returns %d in %llu cycles\n", rc, iElapse);
  }
  free(utf16);
}

int main(int argc, char **argv){
  void *utf16;
  sqlite3 *db;
  int rc;
  int nSql;
  char *zSql;
  int i, j;
  FILE *in;
  sqlite_uint64 iStart, iElapse;
  sqlite_uint64 iSetup = 0;
  int nStmt = 0;
  int nByte = 0;

  if( argc!=3 ){
    fprintf(stderr, "Usage: %s FILENAME SQL-SCRIPT\n"
                    "Runs SQL-SCRIPT as UTF16 against a UTF16 database\n",
                    argv[0]);
    exit(1);
  }
  in = fopen(argv[2], "r");
  fseek(in, 0L, SEEK_END);
  nSql = ftell(in);
  zSql = malloc( nSql+1 );
  fseek(in, 0L, SEEK_SET);
  nSql = fread(zSql, 1, nSql, in);
  zSql[nSql] = 0;

  printf("SQLite version: %d\n", sqlite3_libversion_number());
  unlink(argv[1]);
  utf16 = asciiToUtf16le(argv[1]);
  iStart = sqlite3Hwtime();
  rc = sqlite3_open16(utf16, &db);
  iElapse = sqlite3Hwtime() - iStart;
  iSetup = iElapse;
  printf("sqlite3_open16() returns %d in %llu cycles\n", rc, iElapse);
  free(utf16);
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
          nStmt++;
          nByte += j-i;
          prepareAndRun(db, &zSql[i]);
        }
        zSql[j] = ';';
        i = j+1;
      }
    }
  }
  iStart = sqlite3Hwtime();
  sqlite3_close(db);
  iElapse = sqlite3Hwtime() - iStart;
  iSetup += iElapse;
  printf("sqlite3_close() returns in %llu cycles\n", iElapse);
  printf("\n");
  printf("Statements run:       %15d\n", nStmt);
  printf("Bytes of SQL text:    %15d\n", nByte);
  printf("Total prepare time:   %15llu cycles\n", prepTime);
  printf("Total run time:       %15llu cycles\n", runTime);
  printf("Total finalize time:  %15llu cycles\n", finalizeTime);
  printf("Open/Close time:      %15llu cycles\n", iSetup);
  printf("Total Time:           %15llu cycles\n",
      prepTime + runTime + finalizeTime + iSetup);
  return 0;
}
