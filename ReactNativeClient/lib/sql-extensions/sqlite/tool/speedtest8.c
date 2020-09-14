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
#include <time.h>

#if defined(_MSC_VER)
#include <windows.h>
#else
#include <unistd.h>
#include <sys/times.h>
#include <sched.h>
#endif

#include "sqlite3.h"

/* 
** hwtime.h contains inline assembler code for implementing 
** high-performance timing routines.
*/
#include "hwtime.h"

/*
** Timers
*/
static sqlite_uint64 prepTime = 0;
static sqlite_uint64 runTime = 0;
static sqlite_uint64 finalizeTime = 0;

/*
** Prepare and run a single statement of SQL.
*/
static void prepareAndRun(sqlite3 *db, const char *zSql, int bQuiet){
  sqlite3_stmt *pStmt;
  const char *stmtTail;
  sqlite_uint64 iStart, iElapse;
  int rc;
  
  if (!bQuiet){
    printf("***************************************************************\n");
  }
  if (!bQuiet) printf("SQL statement: [%s]\n", zSql);
  iStart = sqlite3Hwtime();
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, &stmtTail);
  iElapse = sqlite3Hwtime() - iStart;
  prepTime += iElapse;
  if (!bQuiet){
    printf("sqlite3_prepare_v2() returns %d in %llu cycles\n", rc, iElapse);
  }
  if( rc==SQLITE_OK ){
    int nRow = 0;
    iStart = sqlite3Hwtime();
    while( (rc=sqlite3_step(pStmt))==SQLITE_ROW ){ nRow++; }
    iElapse = sqlite3Hwtime() - iStart;
    runTime += iElapse;
    if (!bQuiet){
      printf("sqlite3_step() returns %d after %d rows in %llu cycles\n",
             rc, nRow, iElapse);
    }
    iStart = sqlite3Hwtime();
    rc = sqlite3_finalize(pStmt);
    iElapse = sqlite3Hwtime() - iStart;
    finalizeTime += iElapse;
    if (!bQuiet){
      printf("sqlite3_finalize() returns %d in %llu cycles\n", rc, iElapse);
    }
  }
}

int main(int argc, char **argv){
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
  const char *zArgv0 = argv[0];
  int bQuiet = 0;
#if !defined(_MSC_VER)
  struct tms tmsStart, tmsEnd;
  clock_t clkStart, clkEnd;
#endif

#ifdef HAVE_OSINST
  extern sqlite3_vfs *sqlite3_instvfs_binarylog(char *, char *, char *);
  extern void sqlite3_instvfs_destroy(sqlite3_vfs *);
  sqlite3_vfs *pVfs = 0;
#endif

  while (argc>3)
  {
#ifdef HAVE_OSINST
    if( argc>4 && (strcmp(argv[1], "-log")==0) ){
     pVfs = sqlite3_instvfs_binarylog("oslog", 0, argv[2]);
     sqlite3_vfs_register(pVfs, 1);
     argv += 2;
     argc -= 2;
     continue;
    }
#endif

    /*
    ** Increasing the priority slightly above normal can help with
    ** repeatability of testing.  Note that with Cygwin, -5 equates
    ** to "High", +5 equates to "Low", and anything in between
    ** equates to "Normal".
    */
    if( argc>4 && (strcmp(argv[1], "-priority")==0) ){
#if defined(_MSC_VER)
      int new_priority = atoi(argv[2]);
      if(!SetPriorityClass(GetCurrentProcess(), 
        (new_priority<=-5) ? HIGH_PRIORITY_CLASS : 
        (new_priority<=0)  ? ABOVE_NORMAL_PRIORITY_CLASS : 
        (new_priority==0)  ? NORMAL_PRIORITY_CLASS : 
        (new_priority<5)   ? BELOW_NORMAL_PRIORITY_CLASS : 
        IDLE_PRIORITY_CLASS)){
        printf ("error setting priority\n"); 
        exit(2); 
      }
#else
      struct sched_param myParam;
      sched_getparam(0, &myParam);
      printf ("Current process priority is %d.\n", (int)myParam.sched_priority); 
      myParam.sched_priority = atoi(argv[2]);
      printf ("Setting process priority to %d.\n", (int)myParam.sched_priority); 
      if (sched_setparam (0, &myParam) != 0){
        printf ("error setting priority\n"); 
        exit(2); 
      }
#endif
      argv += 2;
      argc -= 2;
      continue;
    }

    if( argc>3 && strcmp(argv[1], "-quiet")==0 ){
     bQuiet = -1;
     argv++;
     argc--;
     continue;
    }

    break;
  }

  if( argc!=3 ){
   fprintf(stderr, "Usage: %s [options] FILENAME SQL-SCRIPT\n"
              "Runs SQL-SCRIPT against a UTF8 database\n"
              "\toptions:\n"
#ifdef HAVE_OSINST
              "\t-log <log>\n"
#endif
              "\t-priority <value> : set priority of task\n"
              "\t-quiet : only display summary results\n",
              zArgv0);
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
#if !defined(_MSC_VER)
  clkStart = times(&tmsStart);
#endif
  iStart = sqlite3Hwtime();
  rc = sqlite3_open(argv[1], &db);
  iElapse = sqlite3Hwtime() - iStart;
  iSetup = iElapse;
  if (!bQuiet) printf("sqlite3_open() returns %d in %llu cycles\n", rc, iElapse);
  for(i=j=0; j<nSql; j++){
    if( zSql[j]==';' ){
      int isComplete;
      char c = zSql[j+1];
      zSql[j+1] = 0;
      isComplete = sqlite3_complete(&zSql[i]);
      zSql[j+1] = c;
      if( isComplete ){
        zSql[j] = 0;
        while( i<j && isspace(zSql[i]) ){ i++; }
        if( i<j ){
          int n = j - i;
          if( n>=6 && memcmp(&zSql[i], ".crash",6)==0 ) exit(1);
          nStmt++;
          nByte += n;
          prepareAndRun(db, &zSql[i], bQuiet);
        }
        zSql[j] = ';';
        i = j+1;
      }
    }
  }
  iStart = sqlite3Hwtime();
  sqlite3_close(db);
  iElapse = sqlite3Hwtime() - iStart;
#if !defined(_MSC_VER)
  clkEnd = times(&tmsEnd);
#endif
  iSetup += iElapse;
  if (!bQuiet) printf("sqlite3_close() returns in %llu cycles\n", iElapse);

  printf("\n");
  printf("Statements run:        %15d stmts\n", nStmt);
  printf("Bytes of SQL text:     %15d bytes\n", nByte);
  printf("Total prepare time:    %15llu cycles\n", prepTime);
  printf("Total run time:        %15llu cycles\n", runTime);
  printf("Total finalize time:   %15llu cycles\n", finalizeTime);
  printf("Open/Close time:       %15llu cycles\n", iSetup);
  printf("Total time:            %15llu cycles\n",
      prepTime + runTime + finalizeTime + iSetup);

#if !defined(_MSC_VER)
  printf("\n");
  printf("Total user CPU time:   %15.3g secs\n", (tmsEnd.tms_utime - tmsStart.tms_utime)/(double)CLOCKS_PER_SEC );
  printf("Total system CPU time: %15.3g secs\n", (tmsEnd.tms_stime - tmsStart.tms_stime)/(double)CLOCKS_PER_SEC );
  printf("Total real time:       %15.3g secs\n", (clkEnd -clkStart)/(double)CLOCKS_PER_SEC );
#endif

#ifdef HAVE_OSINST
  if( pVfs ){
    sqlite3_instvfs_destroy(pVfs);
    printf("vfs log written to %s\n", argv[0]);
  }
#endif

  return 0;
}
