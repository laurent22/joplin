
/*
** This file is broken into three semi-autonomous parts:
**
**   1. The database functions.
**   2. The thread wrappers.
**   3. The implementation of the mt1.* tests.
*/

/*************************************************************************
** DATABASE CONTENTS:
**
**   The database contains up to N key/value pairs, where N is some large 
**   number (say 10,000,000). Keys are integer values between 0 and (N-1).
**   The value associated with each key is a pseudo-random blob of data.
**
**   Key/value pair keys are encoded as the two bytes "k." followed by a 
**   10-digit decimal number. i.e. key 45 -> "k.0000000045".
**
**   As well as the key/value pairs, the database also contains checksum 
**   entries. The checksums form a hierarchy - for every F key/value
**   entries there is one level 1 checksum. And for each F level 1 checksums
**   there is one level 2 checksum. And so on.
**
**   Checksum keys are encoded as the two byte "c." followed by the 
**   checksum level, followed by a 10 digit decimal number containing
**   the value of the first key that contributes to the checksum value.
**   For example, assuming F==10, the level 1 checksum that spans keys
**   10 to 19 is "c.1.0000000010".
**
**   Clients may perform one of two operations on the database: a read
**   or a write.
** 
** READ OPERATIONS:
**
**   A read operation scans a range of F key/value pairs. It computes
**   the expected checksum and then compares the computed value to the
**   actual value stored in the level 1 checksum entry. It then scans 
**   the group of F level 1 checksums, and compares the computed checksum 
**   to the associated level 2 checksum value, and so on until the 
**   highest level checksum value has been verified.
**
**   If a checksum ever fails to match the expected value, the test 
**   has failed.
**
** WRITE OPERATIONS:
**
**   A write operation involves writing (possibly clobbering) a single
**   key/value pair. The associated level 1 checksum is then recalculated
**   updated. Then the level 2 checksum, and so on until the highest
**   level checksum has been modified.
**
**   All updates occur inside a single transaction.
**
** INTERFACE:
**
**   The interface used by test cases to read and write the db consists
**   of type DbParameters and the following functions:
**
**       dbReadOperation()
**       dbWriteOperation()
*/

#include "lsmtest.h"

typedef struct DbParameters DbParameters;
struct DbParameters {
  int nFanout;                    /* Checksum fanout (F) */
  int nKey;                       /* Size of key space (N) */
};

#define DB_KEY_BYTES          (2+5+10+1)

/*
** Argument aBuf[] must point to a buffer at least DB_KEY_BYTES in size.
** This function populates the buffer with a nul-terminated key string 
** corresponding to key iKey.
*/
static void dbFormatKey(
  DbParameters *pParam,
  int iLevel,
  int iKey,                       /* Key value */
  char *aBuf                      /* Write key string here */
){
  if( iLevel==0 ){
    snprintf(aBuf, DB_KEY_BYTES, "k.%.10d", iKey);
  }else{
    int f = 1;
    int i;
    for(i=0; i<iLevel; i++) f = f * pParam->nFanout;
    snprintf(aBuf, DB_KEY_BYTES, "c.%d.%.10d", iLevel, f*(iKey/f));
  }
}

/*
** Argument aBuf[] must point to a buffer at least DB_KEY_BYTES in size.
** This function populates the buffer with the string representation of
** checksum value iVal.
*/
static void dbFormatCksumValue(u32 iVal, char *aBuf){
  snprintf(aBuf, DB_KEY_BYTES, "%.10u", iVal);
}

/*
** Return the highest level of checksum in the database described
** by *pParam.
*/
static int dbMaxLevel(DbParameters *pParam){
  int iMax;
  int n = 1;
  for(iMax=0; n<pParam->nKey; iMax++){
    n = n * pParam->nFanout;
  }
  return iMax;
}

static void dbCksum(
  void *pCtx,                     /* IN/OUT: Pointer to u32 containing cksum */
  void *pKey, int nKey,           /* Database key. Unused. */
  void *pVal, int nVal            /* Database value. Checksum this. */
){
  u8 *aVal = (u8 *)pVal;
  u32 *pCksum = (u32 *)pCtx;
  u32 cksum = *pCksum;
  int i;

  unused_parameter(pKey);
  unused_parameter(nKey);

  for(i=0; i<nVal; i++){
    cksum += (cksum<<3) + (int)aVal[i];
  }

  *pCksum = cksum;
}

/*
** Compute the value of the checksum stored on level iLevel that contains
** data from key iKey by scanning the pParam->nFanout entries at level 
** iLevel-1.
*/
static u32 dbComputeCksum(
  DbParameters *pParam,           /* Database parameters */
  TestDb *pDb,                    /* Database connection handle */
  int iLevel,                     /* Level of checksum to compute */
  int iKey,                       /* Compute checksum for this key */
  int *pRc                        /* IN/OUT: Error code */
){
  u32 cksum = 0;
  if( *pRc==0 ){
    int nFirst;
    int nLast;
    int iFirst = 0;
    int iLast = 0;
    int i;
    int f = 1;
    char zFirst[DB_KEY_BYTES];
    char zLast[DB_KEY_BYTES];

    assert( iLevel>=1 );
    for(i=0; i<iLevel; i++) f = f * pParam->nFanout;

    iFirst = f*(iKey/f);
    iLast = iFirst + f - 1;
    dbFormatKey(pParam, iLevel-1, iFirst, zFirst);
    dbFormatKey(pParam, iLevel-1, iLast, zLast);
    nFirst = strlen(zFirst);
    nLast = strlen(zLast);

    *pRc = tdb_scan(pDb, (u32*)&cksum, 0, zFirst, nFirst, zLast, nLast,dbCksum);
  }

  return cksum;
}

static void dbReadOperation(
  DbParameters *pParam,           /* Database parameters */
  TestDb *pDb,                    /* Database connection handle */
  void (*xDelay)(void *),
  void *pDelayCtx,
  int iKey,                       /* Key to read */
  int *pRc                        /* IN/OUT: Error code */
){
  const int iMax = dbMaxLevel(pParam);
  int i;

  if( tdb_transaction_support(pDb) ) testBegin(pDb, 1, pRc);
  for(i=1; *pRc==0 && i<=iMax; i++){
    char zCksum[DB_KEY_BYTES];
    char zKey[DB_KEY_BYTES];
    u32 iCksum = 0;

    iCksum = dbComputeCksum(pParam, pDb, i, iKey, pRc);
    if( iCksum ){
      if( xDelay && i==1 ) xDelay(pDelayCtx);
      dbFormatCksumValue(iCksum, zCksum);
      dbFormatKey(pParam, i, iKey, zKey);
      testFetchStr(pDb, zKey, zCksum, pRc);
    }
  }
  if( tdb_transaction_support(pDb) ) testCommit(pDb, 0, pRc);
}

static int dbWriteOperation(
  DbParameters *pParam,           /* Database parameters */
  TestDb *pDb,                    /* Database connection handle */
  int iKey,                       /* Key to write to */
  const char *zValue,             /* Nul-terminated value to write */
  int *pRc                        /* IN/OUT: Error code */
){
  const int iMax = dbMaxLevel(pParam);
  char zKey[DB_KEY_BYTES];
  int i;
  int rc;

  assert( iKey>=0 && iKey<pParam->nKey );
  dbFormatKey(pParam, 0, iKey, zKey);

  /* Open a write transaction. This may fail - SQLITE4_BUSY */
  if( *pRc==0 && tdb_transaction_support(pDb) ){
    rc = tdb_begin(pDb, 2);
    if( rc==5 ) return 0;
    *pRc = rc;
  }

  testWriteStr(pDb, zKey, zValue, pRc);
  for(i=1; i<=iMax; i++){
    char zCksum[DB_KEY_BYTES];
    u32 iCksum = 0;

    iCksum = dbComputeCksum(pParam, pDb, i, iKey, pRc);
    dbFormatCksumValue(iCksum, zCksum);
    dbFormatKey(pParam, i, iKey, zKey);
    testWriteStr(pDb, zKey, zCksum, pRc);
  }
  if( tdb_transaction_support(pDb) ) testCommit(pDb, 0, pRc);
  return 1;
}

/*************************************************************************
** The following block contains testXXX() functions that implement a
** wrapper around the systems native multi-thread support. There are no
** synchronization primitives - just functions to launch and join 
** threads. Wrapper functions are:
**
**    testThreadSupport()
**
**    testThreadInit()
**    testThreadShutdown()
**    testThreadLaunch()
**    testThreadWait()
**
**    testThreadSetHalt()
**    testThreadGetHalt()
**    testThreadSetResult()
**    testThreadGetResult()
**
**    testThreadEnterMutex()
**    testThreadLeaveMutex()
*/
typedef struct ThreadSet ThreadSet;
#ifdef LSM_MUTEX_PTHREADS

#include <pthread.h>
#include <unistd.h>

typedef struct Thread Thread;
struct Thread {
  int rc;
  char *zMsg;
  pthread_t id;
  void (*xMain)(ThreadSet *, int, void *);
  void *pCtx;
  ThreadSet *pThreadSet;
};

struct ThreadSet {
  int bHalt;                      /* Halt flag */
  int nThread;                    /* Number of threads */
  Thread *aThread;                /* Array of Thread structures */
  pthread_mutex_t mutex;          /* Mutex used for cheating */
};

/*
** Return true if this build supports threads, or false otherwise. If
** this function returns false, no other testThreadXXX() functions should
** be called.
*/
static int testThreadSupport(){ return 1; }

/*
** Allocate and return a thread-set handle with enough space allocated
** to handle up to nMax threads. Each call to this function should be
** matched by a call to testThreadShutdown() to delete the object.
*/
static ThreadSet *testThreadInit(int nMax){
  int nByte;                      /* Total space to allocate */
  ThreadSet *p;                   /* Return value */

  nByte = sizeof(ThreadSet) + sizeof(struct Thread) * nMax;
  p = (ThreadSet *)testMalloc(nByte);
  p->nThread = nMax;
  p->aThread = (Thread *)&p[1];
  pthread_mutex_init(&p->mutex, 0);

  return p;
}

/*
** Delete a thread-set object and release all resources held by it.
*/
static void testThreadShutdown(ThreadSet *p){
  int i;
  for(i=0; i<p->nThread; i++){
    testFree(p->aThread[i].zMsg);
  }
  pthread_mutex_destroy(&p->mutex);
  testFree(p);
}

static void *ttMain(void *pArg){
  Thread *pThread = (Thread *)pArg;
  int iThread;
  iThread = (pThread - pThread->pThreadSet->aThread);
  pThread->xMain(pThread->pThreadSet, iThread, pThread->pCtx);
  return 0;
}

/*
** Launch a new thread.
*/
static int testThreadLaunch(
  ThreadSet *p,
  int iThread,
  void (*xMain)(ThreadSet *, int, void *),
  void *pCtx
){
  int rc;
  Thread *pThread;

  assert( iThread>=0 && iThread<p->nThread );

  pThread = &p->aThread[iThread];
  assert( pThread->pThreadSet==0 );
  pThread->xMain = xMain;
  pThread->pCtx = pCtx;
  pThread->pThreadSet = p;
  rc = pthread_create(&pThread->id, 0, ttMain, (void *)pThread);

  return rc;
}

/*
** Set the thread-set "halt" flag.
*/
static void testThreadSetHalt(ThreadSet *pThreadSet){
  pThreadSet->bHalt = 1;
}

/*
** Return the current value of the thread-set "halt" flag.
*/
static int testThreadGetHalt(ThreadSet *pThreadSet){
  return pThreadSet->bHalt;
}

static void testThreadSleep(ThreadSet *pThreadSet, int nMs){
  int nRem = nMs;
  while( nRem>0 && testThreadGetHalt(pThreadSet)==0 ){
    usleep(50000);
    nRem -= 50;
  }
}

/*
** Wait for all threads launched to finish before returning. If nMs
** is greater than zero, set the "halt" flag to tell all threads
** to halt after waiting nMs milliseconds.
*/
static void testThreadWait(ThreadSet *pThreadSet, int nMs){
  int i;

  testThreadSleep(pThreadSet, nMs);
  testThreadSetHalt(pThreadSet);
  for(i=0; i<pThreadSet->nThread; i++){
    Thread *pThread = &pThreadSet->aThread[i];
    if( pThread->xMain ){
      pthread_join(pThread->id, 0);
    }
  }
}

/*
** Set the result for thread iThread. 
*/
static void testThreadSetResult(
  ThreadSet *pThreadSet,          /* Thread-set handle */
  int iThread,                    /* Set result for this thread */
  int rc,                         /* Result error code */
  char *zFmt,                     /* Result string format */
  ...                             /* Result string formatting args... */
){
  va_list ap;

  testFree(pThreadSet->aThread[iThread].zMsg);
  pThreadSet->aThread[iThread].rc = rc;
  pThreadSet->aThread[iThread].zMsg = 0;
  if( zFmt ){
    va_start(ap, zFmt);
    pThreadSet->aThread[iThread].zMsg = testMallocVPrintf(zFmt, ap);
    va_end(ap);
  }
}

/*
** Retrieve the result for thread iThread. 
*/
static int testThreadGetResult(
  ThreadSet *pThreadSet,          /* Thread-set handle */
  int iThread,                    /* Get result for this thread */
  const char **pzRes              /* OUT: Pointer to result string */
){
  if( pzRes ) *pzRes = pThreadSet->aThread[iThread].zMsg;
  return pThreadSet->aThread[iThread].rc;
}

/*
** Enter and leave the test case mutex.
*/
#if 0
static void testThreadEnterMutex(ThreadSet *p){
  pthread_mutex_lock(&p->mutex);
}
static void testThreadLeaveMutex(ThreadSet *p){
  pthread_mutex_unlock(&p->mutex);
}
#endif
#endif

#if !defined(LSM_MUTEX_PTHREADS)
static int testThreadSupport(){ return 0; }

#define testThreadInit(a) 0
#define testThreadShutdown(a)
#define testThreadLaunch(a,b,c,d) 0
#define testThreadWait(a,b)
#define testThreadSetHalt(a)
#define testThreadGetHalt(a) 0
#define testThreadGetResult(a,b,c) 0
#define testThreadSleep(a,b) 0

static void testThreadSetResult(ThreadSet *a, int b, int c, char *d, ...){
  unused_parameter(a);
  unused_parameter(b);
  unused_parameter(c);
  unused_parameter(d);
}
#endif
/* End of threads wrapper.
*************************************************************************/

/*************************************************************************
** Below this point is the third part of this file - the implementation
** of the mt1.* tests.
*/
typedef struct Mt1Test Mt1Test;
struct Mt1Test {
  DbParameters param;             /* Description of database to read/write */
  int nReadwrite;                 /* Number of read/write threads */
  int nFastReader;                /* Number of fast reader threads */
  int nSlowReader;                /* Number of slow reader threads */
  int nMs;                        /* How long to run for */
  const char *zSystem;            /* Database system to test */
};

typedef struct Mt1DelayCtx Mt1DelayCtx;
struct Mt1DelayCtx {
  ThreadSet *pSet;                /* Threadset to sleep within */
  int nMs;                        /* Sleep in ms */
};

static void xMt1Delay(void *pCtx){
  Mt1DelayCtx *p = (Mt1DelayCtx *)pCtx;
  testThreadSleep(p->pSet, p->nMs);
}

#define MT1_THREAD_RDWR 0
#define MT1_THREAD_SLOW 1
#define MT1_THREAD_FAST 2

static void xMt1Work(lsm_db *pDb, void *pCtx){
#if 0
  char *z = 0;
  lsm_info(pDb, LSM_INFO_DB_STRUCTURE, &z);
  printf("%s\n", z);
  fflush(stdout);
#endif
}

/*
** This is the main() proc for all threads in test case "mt1".
*/
static void mt1Main(ThreadSet *pThreadSet, int iThread, void *pCtx){
  Mt1Test *p = (Mt1Test *)pCtx;   /* Test parameters */
  Mt1DelayCtx delay;
  int nRead = 0;                  /* Number of calls to dbReadOperation() */
  int nWrite = 0;                 /* Number of completed database writes */
  int rc = 0;                     /* Error code */
  int iPrng;                      /* Prng argument variable */
  TestDb *pDb;                    /* Database handle */
  int eType;

  delay.pSet = pThreadSet;
  delay.nMs = 0;
  if( iThread<p->nReadwrite ){
    eType = MT1_THREAD_RDWR;
  }else if( iThread<(p->nReadwrite+p->nFastReader) ){
    eType = MT1_THREAD_FAST;
  }else{
    eType = MT1_THREAD_SLOW;
    delay.nMs = (p->nMs / 20);
  }

  /* Open a new database connection. Initialize the pseudo-random number
  ** argument based on the thread number.  */
  iPrng = testPrngValue(iThread);
  pDb = testOpen(p->zSystem, 0, &rc);

  if( rc==0 ){
    tdb_lsm_config_work_hook(pDb, xMt1Work, 0);
  }

  /* Loop until either an error occurs or some other thread sets the
  ** halt flag.  */
  while( rc==0 && testThreadGetHalt(pThreadSet)==0 ){
    int iKey;

    /* Perform a read operation on an arbitrarily selected key. */
    iKey = (testPrngValue(iPrng++) % p->param.nKey);
    dbReadOperation(&p->param, pDb, xMt1Delay, (void *)&delay, iKey, &rc);
    if( rc ) continue;
    nRead++;

    /* Attempt to write an arbitrary key value pair (and update the associated
    ** checksum entries). dbWriteOperation() returns 1 if the write is
    ** successful, or 0 if it failed with an LSM_BUSY error.  */
    if( eType==MT1_THREAD_RDWR ){
      char aValue[50];
      char aRnd[25];

      iKey = (testPrngValue(iPrng++) % p->param.nKey);
      testPrngString(iPrng, aRnd, sizeof(aRnd));
      iPrng += sizeof(aRnd);
      snprintf(aValue, sizeof(aValue), "%d.%s", iThread, aRnd);
      nWrite += dbWriteOperation(&p->param, pDb, iKey, aValue, &rc);
    }
  }
  testClose(&pDb);

  /* If an error has occured, set the thread error code and the threadset 
  ** halt flag to tell the other test threads to halt. Otherwise, set the
  ** thread error code to 0 and post a message with the number of read
  ** and write operations completed.  */
  if( rc ){
    testThreadSetResult(pThreadSet, iThread, rc, 0);
    testThreadSetHalt(pThreadSet);
  }else{
    testThreadSetResult(pThreadSet, iThread, 0, "r/w: %d/%d", nRead, nWrite);
  }
}

static void do_test_mt1(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  Mt1Test aTest[] = {
    /* param, nReadwrite, nFastReader, nSlowReader, nMs, zSystem */
    { {10, 1000},     4, 0, 0,   10000,   0 },
    { {10, 1000},     4, 4, 2,   100000,  0 },
    { {10, 100000},   4, 0, 0,   10000,   0 },
    { {10, 100000},   4, 4, 2,   100000,  0 },
  };
  int i;

  for(i=0; *pRc==0 && i<ArraySize(aTest); i++){
    Mt1Test *p = &aTest[i];
    int bRun = testCaseBegin(pRc, zPattern, 
        "mt1.%s.db=%d,%d.ms=%d.rdwr=%d.fast=%d.slow=%d", 
        zSystem, p->param.nFanout, p->param.nKey, 
        p->nMs, p->nReadwrite, p->nFastReader, p->nSlowReader
    );
    if( bRun ){
      TestDb *pDb;
      ThreadSet *pSet;
      int iThread;
      int nThread;

      p->zSystem = zSystem;
      pDb = testOpen(zSystem, 1, pRc);

      nThread = p->nReadwrite + p->nFastReader + p->nSlowReader;
      pSet = testThreadInit(nThread);
      for(iThread=0; *pRc==0 && iThread<nThread; iThread++){
        testThreadLaunch(pSet, iThread, mt1Main, (void *)p);
      }

      testThreadWait(pSet, p->nMs);
      for(iThread=0; *pRc==0 && iThread<nThread; iThread++){
        *pRc = testThreadGetResult(pSet, iThread, 0);
      }
      testCaseFinish(*pRc);

      for(iThread=0; *pRc==0 && iThread<nThread; iThread++){
        const char *zMsg = 0;
        *pRc = testThreadGetResult(pSet, iThread, &zMsg);
        printf("  Info: thread %d (%d): %s\n", iThread, *pRc, zMsg);
      }

      testThreadShutdown(pSet);
      testClose(&pDb);
    }
  }
}

void test_mt(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  if( testThreadSupport()==0 ) return;
  do_test_mt1(zSystem, zPattern, pRc);
}
