/*
** 2018-10-26
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
** This program is designed for fuzz-testing SQLite database files using
** the -fsanitize=fuzzer option of clang.
**
** The -fsanitize=fuzzer option causes a main() to be inserted automatically.
** That main() invokes LLVMFuzzerTestOneInput(D,S) to be invoked repeatedly.
** Each D is a fuzzed database file.  The code in this file runs various
** SQL statements against that database, trying to provoke a failure.
**
** For best results the seed database files should have these tables:
**
**   Table "t1" with columns "a" and "b"
**   Tables "t2" and "t3 with the same number of compatible columns
**       "t3" should have a column names "x"
**   Table "t4" with a column "x" that is compatible with t3.x.
**
** Any of these tables can be virtual tables, for example FTS or RTree tables.
**
** To run this test:
**
**     mkdir dir
**     cp dbfuzz2-seed*.db dir
**     clang-6.0 -I. -g -O1 -fsanitize=fuzzer \
**       -DTHREADSAFE=0 -DSQLITE_ENABLE_DESERIALIZE \
**       -DSQLITE_ENABLE_DBSTAT_VTAB dbfuzz2.c sqlite3.c -ldl
**     ./a.out dir
*/
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <ctype.h>
#include <stdint.h>
#ifndef _WIN32
#include <sys/time.h>
#include <sys/resource.h>
#endif
#include "sqlite3.h"

/*
** This is the is the SQL that is run against the database.
*/
static const char *azSql[] = {
  "PRAGMA integrity_check;",
  "SELECT * FROM sqlite_schema;",
  "SELECT sum(length(name)) FROM dbstat;",
  "UPDATE t1 SET b=a, a=b WHERE a<b;",
  "ALTER TABLE t1 RENAME TO alkjalkjdfiiiwuer987lkjwer82mx97sf98788s9789s;",
  "INSERT INTO t3 SELECT * FROM t2;",
  "DELETE FROM t3 WHERE x IN (SELECT x FROM t4);",
  "REINDEX;",
  "DROP TABLE t3;",
  "VACUUM;",
};

/* Output verbosity level.  0 means complete silence */
int eVerbosity = 0;

/* True to activate PRAGMA vdbe_debug=on */
static int bVdbeDebug = 0;

/* Maximum size of the in-memory database file */
static sqlite3_int64 szMax = 104857600;

/* Progress handler callback data */
static int nCb = 0;                  /* Number of callbacks seen so far */
static int mxCb = 250000;            /* Maximum allowed callbacks */

/***** Copy/paste from ext/misc/memtrace.c ***************************/
/* The original memory allocation routines */
static sqlite3_mem_methods memtraceBase;
static FILE *memtraceOut;

/* Methods that trace memory allocations */
static void *memtraceMalloc(int n){
  if( memtraceOut ){
    fprintf(memtraceOut, "MEMTRACE: allocate %d bytes\n", 
            memtraceBase.xRoundup(n));
  }
  return memtraceBase.xMalloc(n);
}
static void memtraceFree(void *p){
  if( p==0 ) return;
  if( memtraceOut ){
    fprintf(memtraceOut, "MEMTRACE: free %d bytes\n", memtraceBase.xSize(p));
  }
  memtraceBase.xFree(p);
}
static void *memtraceRealloc(void *p, int n){
  if( p==0 ) return memtraceMalloc(n);
  if( n==0 ){
    memtraceFree(p);
    return 0;
  }
  if( memtraceOut ){
    fprintf(memtraceOut, "MEMTRACE: resize %d -> %d bytes\n",
            memtraceBase.xSize(p), memtraceBase.xRoundup(n));
  }
  return memtraceBase.xRealloc(p, n);
}
static int memtraceSize(void *p){
  return memtraceBase.xSize(p);
}
static int memtraceRoundup(int n){
  return memtraceBase.xRoundup(n);
}
static int memtraceInit(void *p){
  return memtraceBase.xInit(p);
}
static void memtraceShutdown(void *p){
  memtraceBase.xShutdown(p);
}

/* The substitute memory allocator */
static sqlite3_mem_methods ersaztMethods = {
  memtraceMalloc,
  memtraceFree,
  memtraceRealloc,
  memtraceSize,
  memtraceRoundup,
  memtraceInit,
  memtraceShutdown
};

/* Begin tracing memory allocations to out. */
int sqlite3MemTraceActivate(FILE *out){
  int rc = SQLITE_OK;
  if( memtraceBase.xMalloc==0 ){
    rc = sqlite3_config(SQLITE_CONFIG_GETMALLOC, &memtraceBase);
    if( rc==SQLITE_OK ){
      rc = sqlite3_config(SQLITE_CONFIG_MALLOC, &ersaztMethods);
    }
  }
  memtraceOut = out;
  return rc;
}

/* Deactivate memory tracing */
int sqlite3MemTraceDeactivate(void){
  int rc = SQLITE_OK;
  if( memtraceBase.xMalloc!=0 ){
    rc = sqlite3_config(SQLITE_CONFIG_MALLOC, &memtraceBase);
    if( rc==SQLITE_OK ){
      memset(&memtraceBase, 0, sizeof(memtraceBase));
    }
  }
  memtraceOut = 0;
  return rc;
}
/***** End copy/paste from ext/misc/memtrace.c ***************************/

/*
** Progress handler callback
**
** Count the number of callbacks and cause an abort once the limit is
** reached.
*/
static int progress_handler(void *pNotUsed){
  nCb++;
  if( nCb<mxCb ) return 0;
  if( eVerbosity>=1 ){
    printf("-- Progress limit of %d reached\n", mxCb);
  }
  return 1;
}

/* libFuzzer invokes this routine with fuzzed database files (in aData).
** This routine run SQLite against the malformed database to see if it
** can provoke a failure or malfunction.
*/
int LLVMFuzzerTestOneInput(const uint8_t *aData, size_t nByte){
  unsigned char *a;
  sqlite3 *db;
  int rc;
  int i;
  sqlite3_int64 x;
  char *zErr = 0;

  if( eVerbosity>=1 ){
    printf("************** nByte=%d ***************\n", (int)nByte);
    fflush(stdout);
  }
  if( sqlite3_initialize() ) return 0;
  rc = sqlite3_open(0, &db);
  if( rc ) return 1;
  a = sqlite3_malloc64(nByte+1);
  if( a==0 ) return 1;
  memcpy(a, aData, nByte);
  sqlite3_deserialize(db, "main", a, nByte, nByte,
        SQLITE_DESERIALIZE_RESIZEABLE |
        SQLITE_DESERIALIZE_FREEONCLOSE);
  x = szMax;
#ifdef SQLITE_FCNTL_SIZE_LIMIT
  sqlite3_file_control(db, "main", SQLITE_FCNTL_SIZE_LIMIT, &x);
#endif
  if( bVdbeDebug ){
    sqlite3_exec(db, "PRAGMA vdbe_debug=ON", 0, 0, 0);
  }
  if( mxCb>0 ){
    sqlite3_progress_handler(db, 10, progress_handler, 0);
  }
#ifdef SQLITE_TESTCTRL_PRNG_SEED
  sqlite3_test_control(SQLITE_TESTCTRL_PRNG_SEED, 1, db);
#endif
  for(i=0; i<sizeof(azSql)/sizeof(azSql[0]); i++){
    if( eVerbosity>=1 ){
      printf("%s\n", azSql[i]);
      fflush(stdout);
    }
    zErr = 0;
    nCb = 0;
    rc = sqlite3_exec(db, azSql[i], 0, 0, &zErr);
    if( rc && eVerbosity>=1 ){
      printf("-- rc=%d zErr=%s\n", rc, zErr);
    }
    sqlite3_free(zErr);
  }
  rc = sqlite3_close(db);
  if( rc!=SQLITE_OK ){
    fprintf(stdout, "sqlite3_close() returns %d\n", rc);
  }
  if( sqlite3_memory_used()!=0 ){
    int nAlloc = 0;
    int nNotUsed = 0;
    sqlite3_status(SQLITE_STATUS_MALLOC_COUNT, &nAlloc, &nNotUsed, 0);
    fprintf(stderr,"Memory leak: %lld bytes in %d allocations\n",
            sqlite3_memory_used(), nAlloc);
    exit(1);
  }
  return 0;
}

/*
** Return the number of "v" characters in a string.  Return 0 if there
** are any characters in the string other than "v".
*/
static int numberOfVChar(const char *z){
  int N = 0;
  while( z[0] && z[0]=='v' ){
    z++;
    N++;
  }
  return z[0]==0 ? N : 0;
}

/* libFuzzer invokes this routine once when the executable starts, to
** process the command-line arguments.
*/
int LLVMFuzzerInitialize(int *pArgc, char ***pArgv){
  int i, j, n;
  int argc = *pArgc;
  char **argv = *pArgv;
  for(i=j=1; i<argc; i++){
    char *z = argv[i];
    if( z[0]=='-' ){
      z++;
      if( z[0]=='-' ) z++;
      if( z[0]=='v' && (n = numberOfVChar(z))>0 ){
        eVerbosity += n;
        continue;
      }
      if( strcmp(z,"vdbe-debug")==0 ){
        bVdbeDebug = 1;
        continue;
      }
      if( strcmp(z,"limit")==0 ){
        if( i+1==argc ){
          fprintf(stderr, "missing argument to %s\n", argv[i]);
          exit(1);
        }
        mxCb = strtol(argv[++i], 0, 0);
        continue;
      }
      if( strcmp(z,"memtrace")==0 ){
        sqlite3MemTraceActivate(stdout);
        continue;
      }
      if( strcmp(z,"mem")==0 ){
        bVdbeDebug = 1;
        continue;
      }
      if( strcmp(z,"max-db-size")==0 ){
        if( i+1==argc ){
          fprintf(stderr, "missing argument to %s\n", argv[i]);
          exit(1);
        }
        szMax = strtol(argv[++i], 0, 0);
        continue;
      }
#ifndef _WIN32
      if( strcmp(z,"max-stack")==0
       || strcmp(z,"max-data")==0
       || strcmp(z,"max-as")==0
      ){
        struct rlimit x,y;
        int resource = RLIMIT_STACK;
        char *zType = "RLIMIT_STACK";
        if( i+1==argc ){
          fprintf(stderr, "missing argument to %s\n", argv[i]);
          exit(1);
        }
        if( z[4]=='d' ){
          resource = RLIMIT_DATA;
          zType = "RLIMIT_DATA";
        }
        if( z[4]=='a' ){
          resource = RLIMIT_AS;
          zType = "RLIMIT_AS";
        }
        memset(&x,0,sizeof(x));
        getrlimit(resource, &x);
        y.rlim_cur = atoi(argv[++i]);
        y.rlim_max = x.rlim_cur;
        setrlimit(resource, &y);
        memset(&y,0,sizeof(y));
        getrlimit(resource, &y);
        printf("%s changed from %d to %d\n", 
               zType, (int)x.rlim_cur, (int)y.rlim_cur);
        continue;
      }
#endif /* _WIN32 */
    }
    argv[j++] = argv[i];
  }
  argv[j] = 0;
  *pArgc = j;
  return 0;
}

#ifdef STANDALONE
/*
** Read an entire file into memory.  Space to hold the file comes
** from malloc().
*/
static unsigned char *readFile(const char *zName, int *pnByte){
  FILE *in = fopen(zName, "rb");
  long nIn;
  size_t nRead;
  unsigned char *pBuf;
  if( in==0 ) return 0;
  fseek(in, 0, SEEK_END);
  nIn = ftell(in);
  rewind(in);
  pBuf = malloc( nIn+1 );
  if( pBuf==0 ){ fclose(in); return 0; }
  nRead = fread(pBuf, nIn, 1, in);
  fclose(in);
  if( nRead!=1 ){
    free(pBuf);
    return 0;
  }
  pBuf[nIn] = 0;
  if( pnByte ) *pnByte = nIn;
  return pBuf;
}
#endif /* STANDALONE */

#ifdef STANDALONE
int main(int argc, char **argv){
  int i;
  LLVMFuzzerInitialize(&argc, &argv);
  for(i=1; i<argc; i++){
    unsigned char *pIn;
    int nIn;
    pIn = readFile(argv[i], &nIn);
    if( pIn ){
      LLVMFuzzerTestOneInput((const uint8_t*)pIn, (size_t)nIn);
      free(pIn);
    }
  }
#ifdef RUSAGE_SELF
  if( eVerbosity>0 ){
    struct rusage x;
    printf("SQLite %s\n", sqlite3_sourceid());
    memset(&x, 0, sizeof(x));
    if( getrusage(RUSAGE_SELF, &x)==0 ){
      printf("Maximum RSS = %ld KB\n", x.ru_maxrss);
    }
  }
#endif
  return 0;
}
#endif /*STANDALONE*/
