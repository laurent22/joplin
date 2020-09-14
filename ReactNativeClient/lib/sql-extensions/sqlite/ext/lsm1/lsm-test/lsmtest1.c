
#include "lsmtest.h"

#define DATA_SEQUENTIAL TEST_DATASOURCE_SEQUENCE
#define DATA_RANDOM     TEST_DATASOURCE_RANDOM

typedef struct Datatest1 Datatest1;
typedef struct Datatest2 Datatest2;

/*
** An instance of the following structure contains parameters used to
** customize the test function in this file. Test procedure:
**
**   1. Create a data-source based on the "datasource definition" vars.
**
**   2. Insert nRow key value pairs into the database.
**
**   3. Delete all keys from the database. Deletes are done in the same 
**      order as the inserts.
**
** During steps 2 and 3 above, after each Datatest1.nVerify inserts or
** deletes, the following:
**
**   a. Run Datasource.nTest key lookups and check the results are as expected.
**
**   b. If Datasource.bTestScan is true, run a handful (8) of range
**      queries (scanning forwards and backwards). Check that the results
**      are as expected.
**
**   c. Close and reopen the database. Then run (a) and (b) again.
*/
struct Datatest1 {
  /* Datasource definition */
  DatasourceDefn defn;

  /* Test procedure parameters */
  int nRow;                       /* Number of rows to insert then delete */
  int nVerify;                    /* How often to verify the db contents */
  int nTest;                      /* Number of keys to test (0==all) */
  int bTestScan;                  /* True to do scan tests */
};

/*
** An instance of the following data structure is used to describe the
** second type of test case in this file. The chief difference between 
** these tests and those described by Datatest1 is that these tests also
** experiment with range-delete operations. Tests proceed as follows:
**
**     1. Open the datasource described by Datatest2.defn. 
**
**     2. Open a connection on an empty database.
**
**     3. Do this Datatest2.nIter times:
**
**        a) Insert Datatest2.nWrite key-value pairs from the datasource.
**
**        b) Select two pseudo-random keys and use them as the start
**           and end points of a range-delete operation.
**
**        c) Verify that the contents of the database are as expected (see
**           below for details).
**
**        d) Close and then reopen the database handle.
**
**        e) Verify that the contents of the database are still as expected.
**
** The inserts and range deletes are run twice - once on the database being
** tested and once using a control system (sqlite3, kc etc. - something that 
** works). In order to verify that the contents of the db being tested are
** correct, the test runs a bunch of scans and lookups on both the test and
** control databases. If the results are the same, the test passes.
*/
struct Datatest2 {
  DatasourceDefn defn;
  int nRange;
  int nWrite;                     /* Number of writes per iteration */
  int nIter;                      /* Total number of iterations to run */
};

/*
** Generate a unique name for the test case pTest with database system
** zSystem.
*/
static char *getName(const char *zSystem, int bRecover, Datatest1 *pTest){
  char *zRet;
  char *zData;
  zData = testDatasourceName(&pTest->defn);
  zRet = testMallocPrintf("data.%s.%s.rec=%d.%d.%d", 
      zSystem, zData, bRecover, pTest->nRow, pTest->nVerify
  );
  testFree(zData);
  return zRet;
}

int testControlDb(TestDb **ppDb){
#ifdef HAVE_KYOTOCABINET
  return tdb_open("kyotocabinet", "tmp.db", 1, ppDb);
#else
  return tdb_open("sqlite3", "", 1, ppDb);
#endif
}

void testDatasourceFetch(
  TestDb *pDb,                    /* Database handle */
  Datasource *pData,
  int iKey,
  int *pRc                        /* IN/OUT: Error code */
){
  void *pKey; int nKey;           /* Database key to query for */
  void *pVal; int nVal;           /* Expected result of query */

  testDatasourceEntry(pData, iKey, &pKey, &nKey, &pVal, &nVal);
  testFetch(pDb, pKey, nKey, pVal, nVal, pRc);
}

/*
** This function is called to test that the contents of database pDb
** are as expected. In this case, expected is defined as containing
** key-value pairs iFirst through iLast, inclusive, from data source 
** pData. In other words, a loop like the following could be used to
** construct a database with identical contents from scratch.
**
**   for(i=iFirst; i<=iLast; i++){
**     testDatasourceEntry(pData, i, &pKey, &nKey, &pVal, &nVal);
**     // insert (pKey, nKey) -> (pVal, nVal) into database
**   }
**
** The key domain consists of keys 0 to (nRow-1), inclusive, from
** data source pData. For both scan and lookup tests, keys are selected
** pseudo-randomly from within this set.
**
** This function runs nLookupTest lookup tests and nScanTest scan tests.
**
** A lookup test consists of selecting a key from the domain and querying
** pDb for it. The test fails if the presence of the key and, if present,
** the associated value do not match the expectations defined above.
**
** A scan test involves selecting a key from the domain and running
** the following queries:
**
**   1. Scan all keys equal to or greater than the key, in ascending order.
**   2. Scan all keys equal to or smaller than the key, in descending order.
**
** Additionally, if nLookupTest is greater than zero, the following are
** run once:
**
**   1. Scan all keys in the db, in ascending order.
**   2. Scan all keys in the db, in descending order.
**
** As you would assume, the test fails if the returned values do not match
** expectations.
*/
void testDbContents(
  TestDb *pDb,                    /* Database handle being tested */
  Datasource *pData,              /* pDb contains data from here */
  int nRow,                       /* Size of key domain */
  int iFirst,                     /* Index of first key from pData in pDb */
  int iLast,                      /* Index of last key from pData in pDb */
  int nLookupTest,                /* Number of lookup tests to run */
  int nScanTest,                  /* Number of scan tests to run */
  int *pRc                        /* IN/OUT: Error code */
){
  int j;
  int rc = *pRc;

  if( rc==0 && nScanTest ){
    TestDb *pDb2 = 0;

    /* Open a control db (i.e. one that we assume works) */
    rc = testControlDb(&pDb2);

    for(j=iFirst; rc==0 && j<=iLast; j++){
      void *pKey; int nKey;         /* Database key to insert */
      void *pVal; int nVal;         /* Database value to insert */
      testDatasourceEntry(pData, j, &pKey, &nKey, &pVal, &nVal);
      rc = tdb_write(pDb2, pKey, nKey, pVal, nVal);
    }

    if( rc==0 ){
      int iKey1;
      int iKey2;
      void *pKey1; int nKey1;       /* Start key */
      void *pKey2; int nKey2;       /* Final key */

      iKey1 = testPrngValue((iFirst<<8) + (iLast<<16)) % nRow;
      iKey2 = testPrngValue((iLast<<8) + (iFirst<<16)) % nRow;
      testDatasourceEntry(pData, iKey1, &pKey2, &nKey1, 0, 0);
      pKey1 = testMalloc(nKey1+1);
      memcpy(pKey1, pKey2, nKey1+1);
      testDatasourceEntry(pData, iKey2, &pKey2, &nKey2, 0, 0);

      testScanCompare(pDb2, pDb, 0, 0, 0,         0, 0,         &rc);
      testScanCompare(pDb2, pDb, 0, 0, 0,         pKey2, nKey2, &rc);
      testScanCompare(pDb2, pDb, 0, pKey1, nKey1, 0, 0,         &rc);
      testScanCompare(pDb2, pDb, 0, pKey1, nKey1, pKey2, nKey2, &rc);
      testScanCompare(pDb2, pDb, 1, 0, 0,         0, 0,         &rc);
      testScanCompare(pDb2, pDb, 1, 0, 0,         pKey2, nKey2, &rc);
      testScanCompare(pDb2, pDb, 1, pKey1, nKey1, 0, 0,         &rc);
      testScanCompare(pDb2, pDb, 1, pKey1, nKey1, pKey2, nKey2, &rc);
      testFree(pKey1);
    }
    tdb_close(pDb2);
  }

  /* Test some lookups. */
  for(j=0; rc==0 && j<nLookupTest; j++){
    int iKey;                     /* Datasource key to test */
    void *pKey; int nKey;         /* Database key to query for */
    void *pVal; int nVal;         /* Expected result of query */

    if( nLookupTest>=nRow ){
      iKey = j;
    }else{
      iKey = testPrngValue(j + (iFirst<<8) + (iLast<<16)) % nRow;
    }

    testDatasourceEntry(pData, iKey, &pKey, &nKey, &pVal, &nVal);
    if( iFirst>iKey || iKey>iLast ){
      pVal = 0;
      nVal = -1;
    }

    testFetch(pDb, pKey, nKey, pVal, nVal, &rc);
  }

  *pRc = rc;
}

/*
** This function should be called during long running test cases to output
** the progress dots (...) to stdout.
*/
void testCaseProgress(int i, int n, int nDot, int *piDot){
  int iDot = *piDot;
  while( iDot < ( ((nDot*2+1) * i) / (n*2) ) ){
    printf(".");
    fflush(stdout);
    iDot++;
  }
  *piDot = iDot;
}

int testCaseNDot(void){ return 20; }

#if 0
static void printScanCb(
    void *pCtx, void *pKey, int nKey, void *pVal, int nVal
){
  printf("%s\n", (char *)pKey);
  fflush(stdout);
}
#endif

void testReopenRecover(TestDb **ppDb, int *pRc){
  if( *pRc==0 ){
    const char *zLib = tdb_library_name(*ppDb);
    const char *zDflt = tdb_default_db(zLib);
    testCopyLsmdb(zDflt, "bak.db");
    testClose(ppDb);
    testCopyLsmdb("bak.db", zDflt);
    *pRc = tdb_open(zLib, 0, 0, ppDb);
  }
}


static void doDataTest1(
  const char *zSystem,            /* Database system to test */
  int bRecover,
  Datatest1 *p,                   /* Structure containing test parameters */
  int *pRc                        /* OUT: Error code */
){
  int i;
  int iDot;
  int rc = LSM_OK;
  Datasource *pData;
  TestDb *pDb;
  int iToggle = 0;

  /* Start the test case, open a database and allocate the datasource. */
  pDb = testOpen(zSystem, 1, &rc);
  pData = testDatasourceNew(&p->defn);

  i = 0;
  iDot = 0;
  while( rc==LSM_OK && i<p->nRow ){

    /* Insert some data */
    testWriteDatasourceRange(pDb, pData, i, p->nVerify, &rc);
    i += p->nVerify;

    if( iToggle ) testBegin(pDb, 1, &rc);
    /* Check that the db content is correct. */
    testDbContents(pDb, pData, p->nRow, 0, i-1, p->nTest, p->bTestScan, &rc);
    if( iToggle ) testCommit(pDb, 0, &rc);
    iToggle = (iToggle+1)%2;

    if( bRecover ){
      testReopenRecover(&pDb, &rc);
    }else{
      testReopen(&pDb, &rc);
    }

    /* Check that the db content is still correct. */
    testDbContents(pDb, pData, p->nRow, 0, i-1, p->nTest, p->bTestScan, &rc);

    /* Update the progress dots... */
    testCaseProgress(i, p->nRow, testCaseNDot()/2, &iDot);
  }

  i = 0;
  iDot = 0;
  while( rc==LSM_OK && i<p->nRow ){

    /* Delete some entries */
    testDeleteDatasourceRange(pDb, pData, i, p->nVerify, &rc);
    i += p->nVerify;

    /* Check that the db content is correct. */
    testDbContents(pDb, pData, p->nRow, i, p->nRow-1,p->nTest,p->bTestScan,&rc);

    /* Close and reopen the database. */
    if( bRecover ){
      testReopenRecover(&pDb, &rc);
    }else{
      testReopen(&pDb, &rc);
    }

    /* Check that the db content is still correct. */
    testDbContents(pDb, pData, p->nRow, i, p->nRow-1,p->nTest,p->bTestScan,&rc);

    /* Update the progress dots... */
    testCaseProgress(i, p->nRow, testCaseNDot()/2, &iDot);
  }

  /* Free the datasource, close the database and finish the test case. */
  testDatasourceFree(pData);
  tdb_close(pDb);
  testCaseFinish(rc);
  *pRc = rc;
}


void test_data_1(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  Datatest1 aTest[] = {
    { {DATA_RANDOM,     500,600,   1000,2000},     1000,  100,  10,  0},
    { {DATA_RANDOM,     20,25,     100,200},       1000,  250, 1000, 1},
    { {DATA_RANDOM,     8,10,      100,200},       1000,  250, 1000, 1},
    { {DATA_RANDOM,     8,10,      10,20},         1000,  250, 1000, 1},
    { {DATA_RANDOM,     8,10,      1000,2000},     1000,  250, 1000, 1},
    { {DATA_RANDOM,     8,100,     10000,20000},    100,   25,  100, 1},
    { {DATA_RANDOM,     80,100,    10,20},         1000,  250, 1000, 1},
    { {DATA_RANDOM,     5000,6000, 10,20},          100,   25,  100, 1},
    { {DATA_SEQUENTIAL, 5,10,      10,20},         1000,  250, 1000, 1},
    { {DATA_SEQUENTIAL, 5,10,      100,200},       1000,  250, 1000, 1},
    { {DATA_SEQUENTIAL, 5,10,      1000,2000},     1000,  250, 1000, 1},
    { {DATA_SEQUENTIAL, 5,100,     10000,20000},    100,   25,  100, 1},
    { {DATA_RANDOM,     10,10,     100,100},     100000, 1000,  100, 0},
    { {DATA_SEQUENTIAL, 10,10,     100,100},     100000, 1000,  100, 0},
  };

  int i;
  int bRecover;

  for(bRecover=0; bRecover<2; bRecover++){
    if( bRecover==1 && memcmp(zSystem, "lsm", 3) ) break;
    for(i=0; *pRc==LSM_OK && i<ArraySize(aTest); i++){
      char *zName = getName(zSystem, bRecover, &aTest[i]);
      if( testCaseBegin(pRc, zPattern, "%s", zName) ){
        doDataTest1(zSystem, bRecover, &aTest[i], pRc);
      }
      testFree(zName);
    }
  }
}

void testCompareDb(
  Datasource *pData,
  int nData,
  int iSeed,
  TestDb *pControl,
  TestDb *pDb,
  int *pRc
){
  int i;

  static int nCall = 0;
  nCall++;

  testScanCompare(pControl, pDb, 0, 0, 0,         0, 0,         pRc);
  testScanCompare(pControl, pDb, 1, 0, 0,         0, 0,         pRc);

  if( *pRc==0 ){
    int iKey1;
    int iKey2;
    void *pKey1; int nKey1;       /* Start key */
    void *pKey2; int nKey2;       /* Final key */

    iKey1 = testPrngValue(iSeed) % nData;
    iKey2 = testPrngValue(iSeed+1) % nData;
    testDatasourceEntry(pData, iKey1, &pKey2, &nKey1, 0, 0);
    pKey1 = testMalloc(nKey1+1);
    memcpy(pKey1, pKey2, nKey1+1);
    testDatasourceEntry(pData, iKey2, &pKey2, &nKey2, 0, 0);

    testScanCompare(pControl, pDb, 0, 0, 0,         pKey2, nKey2, pRc);
    testScanCompare(pControl, pDb, 0, pKey1, nKey1, 0, 0,         pRc);
    testScanCompare(pControl, pDb, 0, pKey1, nKey1, pKey2, nKey2, pRc);
    testScanCompare(pControl, pDb, 1, 0, 0,         pKey2, nKey2, pRc);
    testScanCompare(pControl, pDb, 1, pKey1, nKey1, 0, 0,         pRc);
    testScanCompare(pControl, pDb, 1, pKey1, nKey1, pKey2, nKey2, pRc);
    testFree(pKey1);
  }

  for(i=0; i<nData && *pRc==0; i++){
    void *pKey; int nKey;
    testDatasourceEntry(pData, i, &pKey, &nKey, 0, 0);
    testFetchCompare(pControl, pDb, pKey, nKey, pRc);
  }
}

static void doDataTest2(
  const char *zSystem,            /* Database system to test */
  int bRecover,
  Datatest2 *p,                   /* Structure containing test parameters */
  int *pRc                        /* OUT: Error code */
){
  TestDb *pDb;
  TestDb *pControl;
  Datasource *pData;
  int i;
  int rc = LSM_OK;
  int iDot = 0;

  /* Start the test case, open a database and allocate the datasource. */
  pDb = testOpen(zSystem, 1, &rc);
  pData = testDatasourceNew(&p->defn);
  rc = testControlDb(&pControl);

  if( tdb_lsm(pDb) ){
    int nBuf = 32 * 1024 * 1024;
    lsm_config(tdb_lsm(pDb), LSM_CONFIG_AUTOFLUSH, &nBuf);
  }

  for(i=0; rc==0 && i<p->nIter; i++){
    void *pKey1; int nKey1;
    void *pKey2; int nKey2;
    int ii;
    int nRange = MIN(p->nIter*p->nWrite, p->nRange);

    for(ii=0; rc==0 && ii<p->nWrite; ii++){
      int iKey = (i*p->nWrite + ii) % p->nRange;
      testWriteDatasource(pControl, pData, iKey, &rc);
      testWriteDatasource(pDb, pData, iKey, &rc);
    }

    testDatasourceEntry(pData, i+1000000, &pKey1, &nKey1, 0, 0);
    pKey1 = testMallocCopy(pKey1, nKey1);
    testDatasourceEntry(pData, i+2000000, &pKey2, &nKey2, 0, 0);

    testDeleteRange(pDb, pKey1, nKey1, pKey2, nKey2, &rc);
    testDeleteRange(pControl, pKey1, nKey1, pKey2, nKey2, &rc);
    testFree(pKey1);

    testCompareDb(pData, nRange, i, pControl, pDb, &rc);
    if( bRecover ){
      testReopenRecover(&pDb, &rc);
    }else{
      testReopen(&pDb, &rc);
    }
    testCompareDb(pData, nRange, i, pControl, pDb, &rc);

    /* Update the progress dots... */
    testCaseProgress(i, p->nIter, testCaseNDot(), &iDot);
  }

  testClose(&pDb);
  testClose(&pControl);
  testDatasourceFree(pData);
  testCaseFinish(rc);
  *pRc = rc;
}

static char *getName2(const char *zSystem, int bRecover, Datatest2 *pTest){
  char *zRet;
  char *zData;
  zData = testDatasourceName(&pTest->defn);
  zRet = testMallocPrintf("data2.%s.%s.rec=%d.%d.%d.%d", 
      zSystem, zData, bRecover, pTest->nRange, pTest->nWrite, pTest->nIter
  );
  testFree(zData);
  return zRet;
}

void test_data_2(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  Datatest2 aTest[] = {
      /* defn,                                 nRange, nWrite, nIter */
    { {DATA_RANDOM,     20,25,     100,200},   10000,  10,     50   },
    { {DATA_RANDOM,     20,25,     100,200},   10000,  200,    50   },
    { {DATA_RANDOM,     20,25,     100,200},   100,    10,     1000 },
    { {DATA_RANDOM,     20,25,     100,200},   100,    200,    50   },
  };

  int i;
  int bRecover;

  for(bRecover=0; bRecover<2; bRecover++){
    if( bRecover==1 && memcmp(zSystem, "lsm", 3) ) break;
    for(i=0; *pRc==LSM_OK && i<ArraySize(aTest); i++){
      char *zName = getName2(zSystem, bRecover, &aTest[i]);
      if( testCaseBegin(pRc, zPattern, "%s", zName) ){
        doDataTest2(zSystem, bRecover, &aTest[i], pRc);
      }
      testFree(zName);
    }
  }
}

/*************************************************************************
** Test case data3.*
*/

typedef struct Datatest3 Datatest3;
struct Datatest3 {
  int nRange;                     /* Keys are between 1 and this value, incl. */
  int nIter;                      /* Number of iterations */
  int nWrite;                     /* Number of writes per iteration */
  int nDelete;                    /* Number of deletes per iteration */

  int nValMin;                    /* Minimum value size for writes */
  int nValMax;                    /* Maximum value size for writes */
};

void testPutU32(u8 *aBuf, u32 iVal){
  aBuf[0] = (iVal >> 24) & 0xFF;
  aBuf[1] = (iVal >> 16) & 0xFF;
  aBuf[2] = (iVal >>  8) & 0xFF;
  aBuf[3] = (iVal >>  0) & 0xFF;
}

void dt3PutKey(u8 *aBuf, int iKey){
  assert( iKey<100000 && iKey>=0 );
  sprintf((char *)aBuf, "%.5d", iKey);
}

static void doDataTest3(
  const char *zSystem,            /* Database system to test */
  Datatest3 *p,                   /* Structure containing test parameters */
  int *pRc                        /* OUT: Error code */
){
  int iDot = 0;
  int rc = *pRc;
  TestDb *pDb;
  u8 *abPresent;                  /* Array of boolean */
  char *aVal;                     /* Buffer to hold values */
  int i;
  u32 iSeq = 10;                  /* prng counter */

  abPresent = (u8 *)testMalloc(p->nRange+1);
  aVal = (char *)testMalloc(p->nValMax+1);
  pDb = testOpen(zSystem, 1, &rc);

  for(i=0; i<p->nIter && rc==0; i++){
    int ii;

    testCaseProgress(i, p->nIter, testCaseNDot(), &iDot);

    /* Perform nWrite inserts */
    for(ii=0; ii<p->nWrite; ii++){
      u8 aKey[6];
      u32 iKey;
      int nVal;

      iKey = (testPrngValue(iSeq++) % p->nRange) + 1;
      nVal = (testPrngValue(iSeq++) % (p->nValMax - p->nValMin)) + p->nValMin;
      testPrngString(testPrngValue(iSeq++), aVal, nVal);
      dt3PutKey(aKey, iKey);

      testWrite(pDb, aKey, sizeof(aKey)-1, aVal, nVal, &rc);
      abPresent[iKey] = 1;
    }

    /* Perform nDelete deletes */
    for(ii=0; ii<p->nDelete; ii++){
      u8 aKey1[6];
      u8 aKey2[6];
      u32 iKey;

      iKey = (testPrngValue(iSeq++) % p->nRange) + 1;
      dt3PutKey(aKey1, iKey-1);
      dt3PutKey(aKey2, iKey+1);

      testDeleteRange(pDb, aKey1, sizeof(aKey1)-1, aKey2, sizeof(aKey2)-1, &rc);
      abPresent[iKey] = 0;
    }

    testReopen(&pDb, &rc);

    for(ii=1; rc==0 && ii<=p->nRange; ii++){
      int nDbVal;
      void *pDbVal;
      u8 aKey[6];
      int dbrc;

      dt3PutKey(aKey, ii);
      dbrc = tdb_fetch(pDb, aKey, sizeof(aKey)-1, &pDbVal, &nDbVal);
      testCompareInt(0, dbrc, &rc);

      if( abPresent[ii] ){
        testCompareInt(1, (nDbVal>0), &rc);
      }else{
        testCompareInt(1, (nDbVal<0), &rc);
      }
    }
  }

  testClose(&pDb);
  testCaseFinish(rc);
  *pRc = rc;
}

static char *getName3(const char *zSystem, Datatest3 *p){
  return testMallocPrintf("data3.%s.%d.%d.%d.%d.(%d..%d)",
      zSystem, p->nRange, p->nIter, p->nWrite, p->nDelete, 
      p->nValMin, p->nValMax
  );
}

void test_data_3(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  Datatest3 aTest[] = {
    /* nRange, nIter, nWrite, nDelete, nValMin, nValMax */
    {  100,    1000,  5,      5,       50,      100 },
    {  100,    1000,  2,      2,        5,       10 },
  };

  int i;

  for(i=0; *pRc==LSM_OK && i<ArraySize(aTest); i++){
    char *zName = getName3(zSystem, &aTest[i]);
    if( testCaseBegin(pRc, zPattern, "%s", zName) ){
      doDataTest3(zSystem, &aTest[i], pRc);
    }
    testFree(zName);
  }
}
