/*
** 2014-12-11
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file implements a simple standalone program used to stress the
** SQLite library when accessing the same set of databases simultaneously
** from multiple threads in shared-cache mode.
**
** This test program runs on unix-like systems only.  It uses pthreads.
** To compile:
**
**     gcc -g -Wall -I. threadtest4.c sqlite3.c -ldl -lpthread
**
** To run:
**
**     ./a.out 10
**
** The argument is the number of threads.  There are also options, such
** as -wal and -multithread and -serialized.
**
** Consider also compiling with clang instead of gcc and adding the
** -fsanitize=thread option.
*/
#include "sqlite3.h"
#include <pthread.h>
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdarg.h>

/*
** An instance of the following structure is passed into each worker
** thread.
*/
typedef struct WorkerInfo WorkerInfo;
struct WorkerInfo {
  int tid;                    /* Thread ID */
  int nWorker;                /* Total number of workers */
  unsigned wkrFlags;          /* Flags */
  sqlite3 *mainDb;            /* Database connection of the main thread */
  sqlite3 *db;                /* Database connection of this thread */
  int nErr;                   /* Number of errors seen by this thread */
  int nTest;                  /* Number of tests run by this thread */
  char *zMsg;                 /* Message returned by this thread */
  pthread_t id;               /* Thread id */
  pthread_mutex_t *pWrMutex;  /* Hold this mutex while writing */
};

/*
** Allowed values for WorkerInfo.wkrFlags
*/
#define TT4_SERIALIZED    0x0000001   /* The --serialized option is used */
#define TT4_WAL           0x0000002   /* WAL mode in use */
#define TT4_TRACE         0x0000004   /* Trace activity */


/*
** Report an OOM error and die if the argument is NULL
*/
static void check_oom(void *x){
  if( x==0 ){
    fprintf(stderr, "out of memory\n");
    exit(1);
  }
}

/*
** Allocate memory.  If the allocation fails, print an error message and
** kill the process.
*/
static void *safe_malloc(int sz){
  void *x = sqlite3_malloc(sz>0?sz:1);
  check_oom(x);
  return x;
}

/*
** Print a trace message for a worker
*/
static void worker_trace(WorkerInfo *p, const char *zFormat, ...){
  va_list ap;
  char *zMsg;
  if( (p->wkrFlags & TT4_TRACE)==0 ) return;
  va_start(ap, zFormat);
  zMsg = sqlite3_vmprintf(zFormat, ap);
  check_oom(zMsg);
  va_end(ap);
  fprintf(stderr, "TRACE(%02d): %s\n", p->tid, zMsg);
  sqlite3_free(zMsg);
}

/*
** Prepare a single SQL query
*/
static sqlite3_stmt *prep_sql(sqlite3 *db, const char *zFormat, ...){
  va_list ap;
  char *zSql;
  int rc;
  sqlite3_stmt *pStmt = 0;

  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  check_oom(zSql);
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  if( rc!=SQLITE_OK ){
    fprintf(stderr, "SQL error (%d,%d): %s\nWhile preparing: [%s]\n",
            rc, sqlite3_extended_errcode(db), sqlite3_errmsg(db), zSql);
    exit(1);
  }
  sqlite3_free(zSql);
  return pStmt;
}

/*
** Run a SQL statements.  Panic if unable.
*/
static void run_sql(WorkerInfo *p, const char *zFormat, ...){
  va_list ap;
  char *zSql;
  int rc;
  sqlite3_stmt *pStmt = 0;
  int nRetry = 0;

  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  check_oom(zSql);
  rc = sqlite3_prepare_v2(p->db, zSql, -1, &pStmt, 0);
  if( rc!=SQLITE_OK ){
    fprintf(stderr, "SQL error (%d,%d): %s\nWhile preparing: [%s]\n",
            rc, sqlite3_extended_errcode(p->db), sqlite3_errmsg(p->db), zSql);
    exit(1);
  }
  worker_trace(p, "running [%s]", zSql);
  while( (rc = sqlite3_step(pStmt))!=SQLITE_DONE ){
    if( (rc&0xff)==SQLITE_BUSY || (rc&0xff)==SQLITE_LOCKED ){
      sqlite3_reset(pStmt);
      nRetry++;
      if( nRetry<10 ){
        worker_trace(p, "retry %d for [%s]", nRetry, zSql);
        sched_yield();
        continue;
      }else{
        fprintf(stderr, "Deadlock in thread %d while running [%s]\n",
                p->tid, zSql);
        exit(1);
      }
    }
    if( rc!=SQLITE_ROW ){
      fprintf(stderr, "SQL error (%d,%d): %s\nWhile running [%s]\n",
              rc, sqlite3_extended_errcode(p->db), sqlite3_errmsg(p->db), zSql);
      exit(1);
    }
  }
  sqlite3_free(zSql);
  sqlite3_finalize(pStmt);
}


/*
** Open the database connection for WorkerInfo.  The order in which
** the files are opened is a function of the tid value.
*/
static void worker_open_connection(WorkerInfo *p, int iCnt){
  char *zFile;
  int x;
  int rc;
  static const unsigned char aOrder[6][3] = {
    { 1, 2, 3},
    { 1, 3, 2},
    { 2, 1, 3},
    { 2, 3, 1},
    { 3, 1, 2},
    { 3, 2, 1}
  };
  x = (p->tid + iCnt) % 6;
  zFile = sqlite3_mprintf("tt4-test%d.db", aOrder[x][0]);
  check_oom(zFile);
  worker_trace(p, "open %s", zFile);
  rc = sqlite3_open_v2(zFile, &p->db,
                       SQLITE_OPEN_READWRITE|SQLITE_OPEN_SHAREDCACHE, 0);
  if( rc!=SQLITE_OK ){
    fprintf(stderr, "sqlite_open_v2(%s) failed on thread %d\n",
            zFile, p->tid);
    exit(1);
  }
  sqlite3_free(zFile);
  run_sql(p, "PRAGMA read_uncommitted=ON;");
  sqlite3_busy_timeout(p->db, 10000);
  run_sql(p, "PRAGMA synchronous=OFF;");
  run_sql(p, "ATTACH 'tt4-test%d.db' AS aux1", aOrder[x][1]);
  run_sql(p, "ATTACH 'tt4-test%d.db' AS aux2", aOrder[x][2]);
}

/*
** Close the worker database connection
*/
static void worker_close_connection(WorkerInfo *p){
  if( p->db ){
    worker_trace(p, "close");
    sqlite3_close(p->db);
    p->db = 0;
  }
}

/*
** Delete all content in the three databases associated with a
** single thread.  Make this happen all in a single transaction if
** inTrans is true, or separately for each database if inTrans is
** false.
*/
static void worker_delete_all_content(WorkerInfo *p, int inTrans){
  if( inTrans ){
    pthread_mutex_lock(p->pWrMutex);
    run_sql(p, "BEGIN");
    run_sql(p, "DELETE FROM t1 WHERE tid=%d", p->tid);
    run_sql(p, "DELETE FROM t2 WHERE tid=%d", p->tid);
    run_sql(p, "DELETE FROM t3 WHERE tid=%d", p->tid);
    run_sql(p, "COMMIT");
    pthread_mutex_unlock(p->pWrMutex);
    p->nTest++;
  }else{
    pthread_mutex_lock(p->pWrMutex);
    run_sql(p, "DELETE FROM t1 WHERE tid=%d", p->tid);
    pthread_mutex_unlock(p->pWrMutex);
    p->nTest++;
    pthread_mutex_lock(p->pWrMutex);
    run_sql(p, "DELETE FROM t2 WHERE tid=%d", p->tid);
    pthread_mutex_unlock(p->pWrMutex);
    p->nTest++;
    pthread_mutex_lock(p->pWrMutex);
    run_sql(p, "DELETE FROM t3 WHERE tid=%d", p->tid);
    pthread_mutex_unlock(p->pWrMutex);
    p->nTest++;
  }
}

/*
** Create rows mn through mx in table iTab for the given worker
*/
static void worker_add_content(WorkerInfo *p, int mn, int mx, int iTab){
  char *zTabDef;
  switch( iTab ){
    case 1:  zTabDef = "t1(tid,sp,a,b,c)";  break;
    case 2:  zTabDef = "t2(tid,sp,d,e,f)";  break;
    case 3:  zTabDef = "t3(tid,sp,x,y,z)";  break;
  }
  pthread_mutex_lock(p->pWrMutex);
  run_sql(p, 
     "WITH RECURSIVE\n"
     " c(i) AS (VALUES(%d) UNION ALL SELECT i+1 FROM c WHERE i<%d)\n"
     "INSERT INTO %s SELECT %d, zeroblob(3000), i, printf('%%d',i), i FROM c;",
     mn, mx, zTabDef, p->tid
  );
  pthread_mutex_unlock(p->pWrMutex);
  p->nTest++;
}

/*
** Set an error message on a worker
*/
static void worker_error(WorkerInfo *p, const char *zFormat, ...){
  va_list ap;
  p->nErr++;
  sqlite3_free(p->zMsg);
  va_start(ap, zFormat);
  p->zMsg = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
}

/*
** Each thread runs the following function.
*/
static void *worker_thread(void *pArg){
  WorkerInfo *p = (WorkerInfo*)pArg;
  int iOuter;
  int i;
  int rc;
  sqlite3_stmt *pStmt;

  printf("worker %d startup\n", p->tid);  fflush(stdout);
  for(iOuter=1; iOuter<=p->nWorker; iOuter++){
    worker_open_connection(p, iOuter);
    for(i=0; i<4; i++){
      worker_add_content(p, i*100+1, (i+1)*100, (p->tid+iOuter)%3 + 1);
      worker_add_content(p, i*100+1, (i+1)*100, (p->tid+iOuter+1)%3 + 1);
      worker_add_content(p, i*100+1, (i+1)*100, (p->tid+iOuter+2)%3 + 1);
    }

    pStmt = prep_sql(p->db, "SELECT count(a) FROM t1 WHERE tid=%d", p->tid);
    worker_trace(p, "query [%s]", sqlite3_sql(pStmt));
    rc = sqlite3_step(pStmt);
    if( rc!=SQLITE_ROW ){
      worker_error(p, "Failed to step: %s", sqlite3_sql(pStmt));
    }else if( sqlite3_column_int(pStmt, 0)!=400 ){
      worker_error(p, "Wrong result: %d", sqlite3_column_int(pStmt,0));
    }
    sqlite3_finalize(pStmt);
    if( p->nErr ) break;

    if( ((iOuter+p->tid)%3)==0 ){
      sqlite3_db_release_memory(p->db);
      p->nTest++;
    }

    pthread_mutex_lock(p->pWrMutex);
    run_sql(p, "BEGIN;");
    run_sql(p, "UPDATE t1 SET c=NULL WHERE a=55");
    run_sql(p, "UPDATE t2 SET f=NULL WHERE d=42");
    run_sql(p, "UPDATE t3 SET z=NULL WHERE x=31");
    run_sql(p, "ROLLBACK;");
    p->nTest++;
    pthread_mutex_unlock(p->pWrMutex);


    if( iOuter==p->tid ){
      pthread_mutex_lock(p->pWrMutex);
      run_sql(p, "VACUUM");
      pthread_mutex_unlock(p->pWrMutex);
    }

    pStmt = prep_sql(p->db,
       "SELECT t1.rowid, t2.rowid, t3.rowid"
       "  FROM t1, t2, t3"
       " WHERE t1.tid=%d AND t2.tid=%d AND t3.tid=%d"
       "   AND t1.a<>t2.d AND t2.d<>t3.x"
       " ORDER BY 1, 2, 3"
       ,p->tid, p->tid, p->tid);
    worker_trace(p, "query [%s]", sqlite3_sql(pStmt));
    for(i=0; i<p->nWorker; i++){
      rc = sqlite3_step(pStmt);
      if( rc!=SQLITE_ROW ){
        worker_error(p, "Failed to step: %s", sqlite3_sql(pStmt));
        break;
      }
      sched_yield();
    }
    sqlite3_finalize(pStmt);
    if( p->nErr ) break;

    worker_delete_all_content(p, (p->tid+iOuter)%2);
    worker_close_connection(p);
    p->db = 0;
  }
  worker_close_connection(p);
  printf("worker %d finished\n", p->tid); fflush(stdout);
  return 0;
}

int main(int argc, char **argv){
  int nWorker = 0;         /* Number of worker threads */
  int i;                   /* Loop counter */
  WorkerInfo *aInfo;       /* Information for each worker */
  unsigned wkrFlags = 0;   /* Default worker flags */
  int nErr = 0;            /* Number of errors */
  int nTest = 0;           /* Number of tests */
  int rc;                  /* Return code */
  sqlite3 *db = 0;         /* Main database connection */
  pthread_mutex_t wrMutex; /* The write serialization mutex */
  WorkerInfo infoTop;      /* WorkerInfo for the main thread */
  WorkerInfo *p;           /* Pointer to infoTop */

  sqlite3_config(SQLITE_CONFIG_MULTITHREAD);
  for(i=1; i<argc; i++){
    const char *z = argv[i];
    if( z[0]=='-' ){
      if( z[1]=='-' && z[2]!=0 ) z++;
      if( strcmp(z,"-multithread")==0 ){
        sqlite3_config(SQLITE_CONFIG_MULTITHREAD);
        wkrFlags &= ~TT4_SERIALIZED;
      }else if( strcmp(z,"-serialized")==0 ){
        sqlite3_config(SQLITE_CONFIG_SERIALIZED);
        wkrFlags |= TT4_SERIALIZED;
      }else if( strcmp(z,"-wal")==0 ){
        wkrFlags |= TT4_WAL;
      }else if( strcmp(z,"-trace")==0 ){
        wkrFlags |= TT4_TRACE;
      }else{
        fprintf(stderr, "unknown command-line option: %s\n", argv[i]);
        exit(1);
      }
    }else if( z[0]>='1' && z[0]<='9' && nWorker==0 ){
      nWorker = atoi(z);
      if( nWorker<2 ){
        fprintf(stderr, "minimum of 2 threads\n");
        exit(1);
      }
    }else{
      fprintf(stderr, "extra command-line argument: \"%s\"\n", argv[i]);
      exit(1);
    }
  }
  if( nWorker==0 ){ 
    fprintf(stderr,
       "usage:  %s ?OPTIONS? N\n"
       "N is the number of threads and must be at least 2.\n"
       "Options:\n"
       "  --serialized\n"
       "  --multithread\n"
       "  --wal\n"
       "  --trace\n"
       ,argv[0]
    );
    exit(1);
  }
  if( !sqlite3_threadsafe() ){
    fprintf(stderr, "requires a threadsafe build of SQLite\n");
    exit(1);
  }
  sqlite3_initialize();
  sqlite3_enable_shared_cache(1);
  pthread_mutex_init(&wrMutex, 0);

  /* Initialize the test database files */
  (void)unlink("tt4-test1.db");
  (void)unlink("tt4-test2.db");
  (void)unlink("tt4-test3.db");
  rc = sqlite3_open("tt4-test1.db", &db);
  if( rc!=SQLITE_OK ){
    fprintf(stderr, "Unable to open test database: tt4-test2.db\n");
    exit(1);
  }
  memset(&infoTop, 0, sizeof(infoTop));
  infoTop.db = db;
  infoTop.wkrFlags = wkrFlags;
  p = &infoTop;
  if( wkrFlags & TT4_WAL ){
    run_sql(p, "PRAGMA journal_mode=WAL");
  }
  run_sql(p, "PRAGMA synchronous=OFF");
  run_sql(p, "CREATE TABLE IF NOT EXISTS t1(tid INTEGER, sp, a, b, c)");
  run_sql(p, "CREATE INDEX t1tid ON t1(tid)");
  run_sql(p, "CREATE INDEX t1ab ON t1(a,b)");
  run_sql(p, "ATTACH 'tt4-test2.db' AS 'test2'");
  run_sql(p, "CREATE TABLE IF NOT EXISTS test2.t2(tid INTEGER, sp, d, e, f)");
  run_sql(p, "CREATE INDEX test2.t2tid ON t2(tid)");
  run_sql(p, "CREATE INDEX test2.t2de ON t2(d,e)");
  run_sql(p, "ATTACH 'tt4-test3.db' AS 'test3'");
  run_sql(p, "CREATE TABLE IF NOT EXISTS test3.t3(tid INTEGER, sp, x, y, z)");
  run_sql(p, "CREATE INDEX test3.t3tid ON t3(tid)");
  run_sql(p, "CREATE INDEX test3.t3xy ON t3(x,y)");
  aInfo = safe_malloc( sizeof(*aInfo)*nWorker );
  memset(aInfo, 0, sizeof(*aInfo)*nWorker);
  for(i=0; i<nWorker; i++){
    aInfo[i].tid = i+1;
    aInfo[i].nWorker = nWorker;
    aInfo[i].wkrFlags = wkrFlags;
    aInfo[i].mainDb = db;
    aInfo[i].pWrMutex = &wrMutex;
    rc = pthread_create(&aInfo[i].id, 0, worker_thread, &aInfo[i]);
    if( rc!=0 ){
      fprintf(stderr, "thread creation failed for thread %d\n", i+1);
      exit(1);
    }
    sched_yield();
  }
  for(i=0; i<nWorker; i++){
    pthread_join(aInfo[i].id, 0);
    printf("Joined thread %d: %d errors in %d tests",
           aInfo[i].tid, aInfo[i].nErr, aInfo[i].nTest);
    if( aInfo[i].zMsg ){
      printf(": %s\n", aInfo[i].zMsg);
    }else{
      printf("\n");
    }
    nErr += aInfo[i].nErr;
    nTest += aInfo[i].nTest;
    fflush(stdout);
  }
  sqlite3_close(db);
  sqlite3_free(aInfo);
  printf("Total %d errors in %d tests\n", nErr, nTest);
  return nErr;
}
