

#include "lsmtest.h"


/*
** Test that the rules for when lsm_csr_next() and lsm_csr_prev() are
** enforced. Specifically:
**
**   * Both functions always return LSM_MISUSE if the cursor is at EOF
**     when they are called.
**
**   * lsm_csr_next() may only be used after lsm_csr_seek(LSM_SEEK_GE) or 
**     lsm_csr_first(). 
**
**   * lsm_csr_prev() may only be used after lsm_csr_seek(LSM_SEEK_LE) or 
**     lsm_csr_last().
*/
static void do_test_api1_lsm(lsm_db *pDb, int *pRc){
  int ret;
  lsm_cursor *pCsr;
  lsm_cursor *pCsr2;
  int nKey;
  const void *pKey;

  ret = lsm_csr_open(pDb, &pCsr);
  testCompareInt(LSM_OK, ret, pRc);

  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  ret = lsm_csr_seek(pCsr, "jjj", 3, LSM_SEEK_GE);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  ret = lsm_csr_seek(pCsr, "jjj", 3, LSM_SEEK_LE);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_OK, ret, pRc);

  ret = lsm_csr_seek(pCsr, "jjj", 3, LSM_SEEK_LEFAST);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  ret = lsm_csr_key(pCsr, &pKey, &nKey);
  testCompareInt(LSM_OK, ret, pRc);

  ret = lsm_csr_open(pDb, &pCsr2);
  testCompareInt(LSM_OK, ret, pRc);

  ret = lsm_csr_seek(pCsr2, pKey, nKey, LSM_SEEK_EQ);
  testCompareInt(LSM_OK, ret, pRc);
  testCompareInt(1, lsm_csr_valid(pCsr2), pRc);
  ret = lsm_csr_next(pCsr2);
  testCompareInt(LSM_MISUSE, ret, pRc);
  ret = lsm_csr_prev(pCsr2);
  testCompareInt(LSM_MISUSE, ret, pRc);

  lsm_csr_close(pCsr2);

  ret = lsm_csr_first(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  ret = lsm_csr_last(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  ret = lsm_csr_first(pCsr);
  while( lsm_csr_valid(pCsr) ){
    ret = lsm_csr_next(pCsr);
    testCompareInt(LSM_OK, ret, pRc);
  }
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  ret = lsm_csr_last(pCsr);
  while( lsm_csr_valid(pCsr) ){
    ret = lsm_csr_prev(pCsr);
    testCompareInt(LSM_OK, ret, pRc);
  }
  ret = lsm_csr_prev(pCsr);
  testCompareInt(LSM_OK, ret, pRc);
  ret = lsm_csr_next(pCsr);
  testCompareInt(LSM_MISUSE, ret, pRc);

  lsm_csr_close(pCsr);
}

static void do_test_api1(const char *zPattern, int *pRc){
  if( testCaseBegin(pRc, zPattern, "api1.lsm") ){
    const DatasourceDefn defn = { TEST_DATASOURCE_RANDOM, 10, 15, 200, 250 };
    Datasource *pData;
    TestDb *pDb;
    int rc = 0;

    pDb = testOpen("lsm_lomem", 1, &rc);
    pData = testDatasourceNew(&defn);
    testWriteDatasourceRange(pDb, pData, 0, 1000, pRc);

    do_test_api1_lsm(tdb_lsm(pDb), pRc);

    testDatasourceFree(pData);
    testClose(&pDb);

    testCaseFinish(*pRc);
  }
}

static lsm_db *newLsmConnection(
  const char *zDb, 
  int nPgsz, 
  int nBlksz,
  int *pRc
){
  lsm_db *db = 0;
  if( *pRc==0 ){
    int n1 = nPgsz;
    int n2 = nBlksz;
    *pRc = lsm_new(tdb_lsm_env(), &db);
    if( *pRc==0 ){
      if( n1 ) lsm_config(db, LSM_CONFIG_PAGE_SIZE, &n1);
      if( n2 ) lsm_config(db, LSM_CONFIG_BLOCK_SIZE, &n2);
      *pRc = lsm_open(db, "testdb.lsm");
    }
  }
  return db;
}

static void testPagesize(lsm_db *db, int nPgsz, int nBlksz, int *pRc){
  if( *pRc==0 ){
    int n1 = 0;
    int n2 = 0;

    lsm_config(db, LSM_CONFIG_PAGE_SIZE, &n1);
    lsm_config(db, LSM_CONFIG_BLOCK_SIZE, &n2);

    testCompareInt(n1, nPgsz, pRc);
    testCompareInt(n2, nBlksz, pRc);
  }
}

/*
** Test case "api2" tests that the default page and block sizes of a 
** database may only be modified before lsm_open() is called. And that
** after lsm_open() is called lsm_config() may be used to read the 
** actual page and block size of the db.
*/
static void do_test_api2(const char *zPattern, int *pRc){
  if( *pRc==0 && testCaseBegin(pRc, zPattern, "api2.lsm") ){
    lsm_db *db1 = 0;
    lsm_db *db2 = 0;

    testDeleteLsmdb("testdb.lsm");
    db1 = newLsmConnection("testdb.lsm", 0, 0, pRc);
    testPagesize(db1, 4096, 1024, pRc);
    db2 = newLsmConnection("testdb.lsm", 1024, 64*1024, pRc);
    testPagesize(db2, 4096, 1024, pRc);
    lsm_close(db1);
    lsm_close(db2);

    testDeleteLsmdb("testdb.lsm");
    db1 = newLsmConnection("testdb.lsm", 1024, 64*1024, pRc);
    testPagesize(db1, 1024, 64*1024, pRc);
    db2 = newLsmConnection("testdb.lsm", 0, 0, pRc);
    testPagesize(db2, 1024, 64*1024, pRc);
    lsm_close(db1);
    lsm_close(db2);

    testDeleteLsmdb("testdb.lsm");
    db1 = newLsmConnection("testdb.lsm", 8192, 2*1024, pRc);
    testPagesize(db1, 8192, 2*1024, pRc);
    db2 = newLsmConnection("testdb.lsm", 1024, 64*1024, pRc);
    testPagesize(db2, 8192, 2*1024, pRc);
    lsm_close(db1);
    lsm_close(db2);

    testCaseFinish(*pRc);
  }
}

void test_api(
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  do_test_api1(zPattern, pRc);
  do_test_api2(zPattern, pRc);
}
