

/*
** This file contains tests related to the explicit rollback of database
** transactions and sub-transactions.
*/


/*
** Repeat 2000 times (until the db contains 100,000 entries):
**
**   1. Open a transaction and insert 500 rows, opening a nested 
**      sub-transaction each 100 rows.
**
**   2. Roll back to each sub-transaction savepoint. Check the database
**      checksum looks Ok.
**
**   3. Every second iteration, roll back the main transaction. Check the
**      db checksum is correct. Every other iteration, commit the main
**      transaction (increasing the size of the db by 100 rows).
*/


#include "lsmtest.h"

struct CksumDb {
  int nFirst;
  int nLast;
  int nStep;
  char **azCksum;
};

CksumDb *testCksumArrayNew(
  Datasource *pData, 
  int nFirst, 
  int nLast, 
  int nStep
){
  TestDb *pDb;
  CksumDb *pRet;
  int i;
  int nEntry;
  int rc = 0;

  assert( nLast>=nFirst && ((nLast-nFirst)%nStep)==0 );
 
  pRet = malloc(sizeof(CksumDb));
  memset(pRet, 0, sizeof(CksumDb));
  pRet->nFirst = nFirst;
  pRet->nLast = nLast;
  pRet->nStep = nStep;
  nEntry = 1 + ((nLast - nFirst) / nStep);

  /* Allocate space so that azCksum is an array of nEntry pointers to
  ** buffers each TEST_CKSUM_BYTES in size.  */
  pRet->azCksum = (char **)malloc(nEntry * (sizeof(char *) + TEST_CKSUM_BYTES));
  for(i=0; i<nEntry; i++){
    char *pStart = (char *)(&pRet->azCksum[nEntry]);
    pRet->azCksum[i] = &pStart[i * TEST_CKSUM_BYTES];
  }

  tdb_open("lsm", "tempdb.lsm", 1, &pDb);
  testWriteDatasourceRange(pDb, pData, 0, nFirst, &rc);
  for(i=0; i<nEntry; i++){
    testCksumDatabase(pDb, pRet->azCksum[i]);
    if( i==nEntry ) break;
    testWriteDatasourceRange(pDb, pData, nFirst+i*nStep, nStep, &rc);
  }

  tdb_close(pDb);

  return pRet;
}

char *testCksumArrayGet(CksumDb *p, int nRow){
  int i;
  assert( nRow>=p->nFirst );
  assert( nRow<=p->nLast );
  assert( ((nRow-p->nFirst) % p->nStep)==0 );

  i = (nRow - p->nFirst) / p->nStep;
  return p->azCksum[i];
}

void testCksumArrayFree(CksumDb *p){
  free(p->azCksum);
  memset(p, 0x55, sizeof(*p));
  free(p);
}

/* End of CksumDb code.
**************************************************************************/

/*
** Test utility function. Write key-value pair $i from datasource pData 
** into database pDb.
*/
void testWriteDatasource(TestDb *pDb, Datasource *pData, int i, int *pRc){
  void *pKey; int nKey;
  void *pVal; int nVal;
  testDatasourceEntry(pData, i, &pKey, &nKey, &pVal, &nVal);
  testWrite(pDb, pKey, nKey, pVal, nVal, pRc);
}

/*
** Test utility function. Delete datasource pData key $i from database pDb.
*/
void testDeleteDatasource(TestDb *pDb, Datasource *pData, int i, int *pRc){
  void *pKey; int nKey;
  testDatasourceEntry(pData, i, &pKey, &nKey, 0, 0);
  testDelete(pDb, pKey, nKey, pRc);
}

/*
** This function inserts nWrite key/value pairs into database pDb - the
** nWrite key value pairs starting at iFirst from data source pData.
*/
void testWriteDatasourceRange(
  TestDb *pDb,                    /* Database to write to */
  Datasource *pData,              /* Data source to read values from */
  int iFirst,                     /* Index of first key/value pair */
  int nWrite,                     /* Number of key/value pairs to write */
  int *pRc                        /* IN/OUT: Error code */
){
  int i;
  for(i=0; i<nWrite; i++){
    testWriteDatasource(pDb, pData, iFirst+i, pRc);
  }
}

void testDeleteDatasourceRange(
  TestDb *pDb,                    /* Database to write to */
  Datasource *pData,              /* Data source to read keys from */
  int iFirst,                     /* Index of first key */
  int nWrite,                     /* Number of keys to delete */
  int *pRc                        /* IN/OUT: Error code */
){
  int i;
  for(i=0; i<nWrite; i++){
    testDeleteDatasource(pDb, pData, iFirst+i, pRc);
  }
}

static char *getName(const char *zSystem){ 
  char *zRet; 
  zRet = testMallocPrintf("rollback.%s", zSystem);
  return zRet;
}

static int rollback_test_1(
  const char *zSystem,
  Datasource *pData
){
  const int nRepeat = 100;

  TestDb *pDb;
  int rc;
  int i;
  CksumDb *pCksum;
  char *zName;

  zName = getName(zSystem);
  testCaseStart(&rc, zName);
  testFree(zName);

  pCksum = testCksumArrayNew(pData, 0, nRepeat*100, 100);
  pDb = 0;
  rc = tdb_open(zSystem, 0, 1, &pDb);
  if( pDb && tdb_transaction_support(pDb)==0 ){
    testCaseSkip();
    goto skip_rollback_test;
  }

  for(i=0; i<nRepeat && rc==0; i++){
    char zCksum[TEST_CKSUM_BYTES];
    int nCurrent = (((i+1)/2) * 100);
    int nDbRow;
    int iTrans;

    /* Check that the database is the expected size. */
    nDbRow = testCountDatabase(pDb);
    testCompareInt(nCurrent, nDbRow, &rc);

    for(iTrans=2; iTrans<=6 && rc==0; iTrans++){
      tdb_begin(pDb, iTrans);
      testWriteDatasourceRange(pDb, pData, nCurrent, 100, &rc);
      nCurrent += 100;
    }

    testCksumDatabase(pDb, zCksum);
    testCompareStr(zCksum, testCksumArrayGet(pCksum, nCurrent), &rc);

    for(iTrans=6; iTrans>2 && rc==0; iTrans--){
      tdb_rollback(pDb, iTrans);
      nCurrent -= 100;
      testCksumDatabase(pDb, zCksum);
      testCompareStr(zCksum, testCksumArrayGet(pCksum, nCurrent), &rc);
    }

    if( i%2 ){
      tdb_rollback(pDb, 0);
      nCurrent -= 100;
      testCksumDatabase(pDb, zCksum);
      testCompareStr(zCksum, testCksumArrayGet(pCksum, nCurrent), &rc);
    }else{
      tdb_commit(pDb, 0);
    }
  }
  testCaseFinish(rc);

 skip_rollback_test:
  tdb_close(pDb);
  testCksumArrayFree(pCksum);
  return rc;
}

void test_rollback(
  const char *zSystem, 
  const char *zPattern, 
  int *pRc
){
  if( *pRc==0 ){
    int bRun = 1;

    if( zPattern ){
      char *zName = getName(zSystem);
      bRun = testGlobMatch(zPattern, zName);
      testFree(zName);
    }

    if( bRun ){
      DatasourceDefn defn = { TEST_DATASOURCE_RANDOM, 10, 15, 50, 100 };
      Datasource *pData = testDatasourceNew(&defn);
      *pRc = rollback_test_1(zSystem, pData);
      testDatasourceFree(pData);
    }
  }
}
