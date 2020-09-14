
#include "lsmtest.h"

#define DATA_SEQUENTIAL TEST_DATASOURCE_SEQUENCE
#define DATA_RANDOM     TEST_DATASOURCE_RANDOM

typedef struct Datatest4 Datatest4;

/*
** Test overview:
**
**   1. Insert (Datatest4.nRec) records into a database.
**
**   2. Repeat (Datatest4.nRepeat) times:
**
**      2a. Delete 2/3 of the records in the database.
**
**      2b. Run lsm_work(nMerge=1).
**
**      2c. Insert as many records as were deleted in 2a.
**
**      2d. Check database content is as expected.
**
**      2e. If (Datatest4.bReopen) is true, close and reopen the database.
*/
struct Datatest4 {
  /* Datasource definition */
  DatasourceDefn defn;

  int nRec;
  int nRepeat;
  int bReopen;
};

static void doDataTest4(
  const char *zSystem,            /* Database system to test */
  Datatest4 *p,                   /* Structure containing test parameters */
  int *pRc                        /* OUT: Error code */
){
  lsm_db *db = 0;
  TestDb *pDb;
  TestDb *pControl;
  Datasource *pData;
  int i;
  int rc = 0;
  int iDot = 0;
  int bMultiThreaded = 0;         /* True for MT LSM database */

  int nRecOn3 = (p->nRec / 3);
  int iData = 0;

  /* Start the test case, open a database and allocate the datasource. */
  rc = testControlDb(&pControl);
  pDb = testOpen(zSystem, 1, &rc);
  pData = testDatasourceNew(&p->defn);
  if( rc==0 ){
    db = tdb_lsm(pDb);
    bMultiThreaded = tdb_lsm_multithread(pDb);
  }

  testWriteDatasourceRange(pControl, pData, iData, nRecOn3*3, &rc);
  testWriteDatasourceRange(pDb,      pData, iData, nRecOn3*3, &rc);

  for(i=0; rc==0 && i<p->nRepeat; i++){

    testDeleteDatasourceRange(pControl, pData, iData, nRecOn3*2, &rc);
    testDeleteDatasourceRange(pDb,      pData, iData, nRecOn3*2, &rc);

    if( db ){
      int nDone;
#if 0
      fprintf(stderr, "lsm_work() start...\n"); fflush(stderr);
#endif
      do {
        nDone = 0;
        rc = lsm_work(db, 1, (1<<30), &nDone);
      }while( rc==0 && nDone>0 );
      if( bMultiThreaded && rc==LSM_BUSY ) rc = LSM_OK;
#if 0 
      fprintf(stderr, "lsm_work() done...\n"); fflush(stderr);
#endif
    }

if( i+1<p->nRepeat ){
    iData += (nRecOn3*2);
    testWriteDatasourceRange(pControl, pData, iData+nRecOn3, nRecOn3*2, &rc);
    testWriteDatasourceRange(pDb,      pData, iData+nRecOn3, nRecOn3*2, &rc);

    testCompareDb(pData, nRecOn3*3, iData, pControl, pDb, &rc);

    /* If Datatest4.bReopen is true, close and reopen the database */
    if( p->bReopen ){
      testReopen(&pDb, &rc);
      if( rc==0 ) db = tdb_lsm(pDb);
    }
}

    /* Update the progress dots... */
    testCaseProgress(i, p->nRepeat, testCaseNDot(), &iDot);
  }

  testClose(&pDb);
  testClose(&pControl);
  testDatasourceFree(pData);
  testCaseFinish(rc);
  *pRc = rc;
}

static char *getName4(const char *zSystem, Datatest4 *pTest){
  char *zRet;
  char *zData;
  zData = testDatasourceName(&pTest->defn);
  zRet = testMallocPrintf("data4.%s.%s.%d.%d.%d", 
      zSystem, zData, pTest->nRec, pTest->nRepeat, pTest->bReopen
  );
  testFree(zData);
  return zRet;
}

void test_data_4(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  Datatest4 aTest[] = {
      /* defn,                                 nRec, nRepeat, bReopen */
    { {DATA_RANDOM,     20,25,     500,600}, 10000,      10,       0   },
    { {DATA_RANDOM,     20,25,     500,600}, 10000,      10,       1   },
  };

  int i;

  for(i=0; *pRc==LSM_OK && i<ArraySize(aTest); i++){
    char *zName = getName4(zSystem, &aTest[i]);
    if( testCaseBegin(pRc, zPattern, "%s", zName) ){
      doDataTest4(zSystem, &aTest[i], pRc);
    }
    testFree(zName);
  }
}
