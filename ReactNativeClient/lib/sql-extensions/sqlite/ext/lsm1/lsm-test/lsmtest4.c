
/*
** This file contains test cases involving multiple database clients.
*/

#include "lsmtest.h"

/*
** The following code implements test cases "mc1.*".
**
** This test case uses one writer and $nReader readers. All connections
** are driven by a single thread. All connections are opened at the start
** of the test and remain open until the test is finished.
**
** The test consists of $nStep steps. Each step the following is performed:
**
**   1. The writer inserts $nWriteStep records into the db.
**
**   2. The writer checks that the contents of the db are as expected.
**
**   3. Each reader that currently has an open read transaction also checks
**      that the contents of the db are as expected (according to the snapshot
**      the read transaction is reading - see below).
**
** After step 1, reader 1 opens a read transaction. After step 2, reader
** 2 opens a read transaction, and so on. At step ($nReader+1), reader 1
** closes the current read transaction and opens a new one. And so on.
** The result is that at step N (for N > $nReader), there exists a reader
** with an open read transaction reading the snapshot committed following
** steps (N-$nReader-1) to N. 
*/
typedef struct Mctest Mctest;
struct Mctest {
  DatasourceDefn defn;            /* Datasource to use */
  int nStep;                      /* Total number of steps in test */
  int nWriteStep;                 /* Number of rows to insert each step */
  int nReader;                    /* Number of read connections */
};
static void do_mc_test(
  const char *zSystem,            /* Database system to test */
  Mctest *pTest,
  int *pRc                        /* IN/OUT: return code */
){
  const int nDomain = pTest->nStep * pTest->nWriteStep;
  Datasource *pData;              /* Source of data */
  TestDb *pDb;                    /* First database connection (writer) */
  int iReader;                    /* Used to iterate through aReader */
  int iStep;                      /* Current step in test */
  int iDot = 0;                   /* Current step in test */

  /* Array of reader connections */
  struct Reader {
    TestDb *pDb;                  /* Connection handle */
    int iLast;                    /* Current snapshot contains keys 0..iLast */
  } *aReader;

  /* Create a data source */
  pData = testDatasourceNew(&pTest->defn);

  /* Open the writer connection */
  pDb = testOpen(zSystem, 1, pRc);

  /* Allocate aReader */
  aReader = (struct Reader *)testMalloc(sizeof(aReader[0]) * pTest->nReader);
  for(iReader=0; iReader<pTest->nReader; iReader++){
    aReader[iReader].pDb = testOpen(zSystem, 0, pRc);
  }

  for(iStep=0; iStep<pTest->nStep; iStep++){
    int iLast;
    int iBegin;                   /* Start read trans using aReader[iBegin] */

    /* Insert nWriteStep more records into the database */
    int iFirst = iStep*pTest->nWriteStep;
    testWriteDatasourceRange(pDb, pData, iFirst, pTest->nWriteStep, pRc);

    /* Check that the db is Ok according to the writer */
    iLast = (iStep+1) * pTest->nWriteStep - 1;
    testDbContents(pDb, pData, nDomain, 0, iLast, iLast, 1, pRc);

    /* Have reader (iStep % nReader) open a read transaction here. */
    iBegin = (iStep % pTest->nReader);
    if( iBegin<iStep ) tdb_commit(aReader[iBegin].pDb, 0);
    tdb_begin(aReader[iBegin].pDb, 1);
    aReader[iBegin].iLast = iLast;

    /* Check that the db is Ok for each open reader */
    for(iReader=0; iReader<pTest->nReader && aReader[iReader].iLast; iReader++){
      iLast = aReader[iReader].iLast;
      testDbContents(
          aReader[iReader].pDb, pData, nDomain, 0, iLast, iLast, 1, pRc
      );
    }

    /* Report progress */
    testCaseProgress(iStep, pTest->nStep, testCaseNDot(), &iDot);
  }

  /* Close all readers */
  for(iReader=0; iReader<pTest->nReader; iReader++){
    testClose(&aReader[iReader].pDb);
  }
  testFree(aReader);

  /* Close the writer-connection and free the datasource */
  testClose(&pDb);
  testDatasourceFree(pData);
}


void test_mc(
  const char *zSystem,            /* Database system name */
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  int i;
  Mctest aTest[] = {
    { { TEST_DATASOURCE_RANDOM, 10,10, 100,100 }, 100, 10, 5 },
  };

  for(i=0; i<ArraySize(aTest); i++){
    if( testCaseBegin(pRc, zPattern, "mc1.%s.%d", zSystem, i) ){
      do_mc_test(zSystem, &aTest[i], pRc);
      testCaseFinish(*pRc);
    }
  }
}
