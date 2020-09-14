
#include "lsmtest.h"

typedef struct OomTest OomTest;
struct OomTest {
  lsm_env *pEnv;
  int iNext;                      /* Next value to pass to testMallocOom() */
  int nFail;                      /* Number of OOM events injected */
  int bEnable;
  int rc;                         /* Test case error code */
};

static void testOomStart(OomTest *p){
  memset(p, 0, sizeof(OomTest));
  p->iNext = 1;
  p->bEnable = 1;
  p->nFail = 1;
  p->pEnv = tdb_lsm_env();
}

static void xOomHook(OomTest *p){
  p->nFail++;
}

static int testOomContinue(OomTest *p){
  if( p->rc!=0 || (p->iNext>1 && p->nFail==0) ){
    return 0;
  }
  p->nFail = 0;
  testMallocOom(p->pEnv, p->iNext, 0, (void (*)(void*))xOomHook, (void *)p);
  return 1;
}

static void testOomEnable(OomTest *p, int bEnable){
  p->bEnable = bEnable;
  testMallocOomEnable(p->pEnv, bEnable);
}

static void testOomNext(OomTest *p){
  p->iNext++;
}

static int testOomHit(OomTest *p){
  return (p->nFail>0);
}

static int testOomFinish(OomTest *p){
  return p->rc;
}

static void testOomAssert(OomTest *p, int bVal){
  if( bVal==0 ){
    test_failed();
    p->rc = 1;
  }
}

/*
** Test that the error code matches the state of the OomTest object passed
** as the first argument. Specifically, check that rc is LSM_NOMEM if an 
** OOM error has already been injected, or LSM_OK if not.
*/
static void testOomAssertRc(OomTest *p, int rc){
  testOomAssert(p, rc==LSM_OK || rc==LSM_NOMEM);
  testOomAssert(p, testOomHit(p)==(rc==LSM_NOMEM) || p->bEnable==0 );
}

static void testOomOpen(
  OomTest *pOom,
  const char *zName,
  lsm_db **ppDb,
  int *pRc
){
  if( *pRc==LSM_OK ){
    int rc;
    rc = lsm_new(tdb_lsm_env(), ppDb);
    if( rc==LSM_OK ) rc = lsm_open(*ppDb, zName);
    testOomAssertRc(pOom, rc);
    *pRc = rc;
  }
}

static void testOomFetch(
  OomTest *pOom,
  lsm_db *pDb,
  void *pKey, int nKey,
  void *pVal, int nVal,
  int *pRc
){
  testOomAssertRc(pOom, *pRc);
  if( *pRc==LSM_OK ){
    lsm_cursor *pCsr;
    int rc;

    rc = lsm_csr_open(pDb, &pCsr);
    if( rc==LSM_OK ) rc = lsm_csr_seek(pCsr, pKey, nKey, 0);
    testOomAssertRc(pOom, rc);

    if( rc==LSM_OK ){
      const void *p; int n;
      testOomAssert(pOom, lsm_csr_valid(pCsr));

      rc = lsm_csr_key(pCsr, &p, &n);
      testOomAssertRc(pOom, rc);
      testOomAssert(pOom, rc!=LSM_OK || (n==nKey && memcmp(pKey, p, nKey)==0) );
    }

    if( rc==LSM_OK ){
      const void *p; int n;
      testOomAssert(pOom, lsm_csr_valid(pCsr));

      rc = lsm_csr_value(pCsr, &p, &n);
      testOomAssertRc(pOom, rc);
      testOomAssert(pOom, rc!=LSM_OK || (n==nVal && memcmp(pVal, p, nVal)==0) );
    }

    lsm_csr_close(pCsr);
    *pRc = rc;
  }
}

static void testOomWrite(
  OomTest *pOom,
  lsm_db *pDb,
  void *pKey, int nKey,
  void *pVal, int nVal,
  int *pRc
){
  testOomAssertRc(pOom, *pRc);
  if( *pRc==LSM_OK ){
    int rc;

    rc = lsm_insert(pDb, pKey, nKey, pVal, nVal);
    testOomAssertRc(pOom, rc);

    *pRc = rc;
  }
}


static void testOomFetchStr(
  OomTest *pOom,
  lsm_db *pDb,
  const char *zKey,
  const char *zVal,
  int *pRc
){
  int nKey = strlen(zKey);
  int nVal = strlen(zVal);
  testOomFetch(pOom, pDb, (void *)zKey, nKey, (void *)zVal, nVal, pRc);
}

static void testOomFetchData(
  OomTest *pOom,
  lsm_db *pDb,
  Datasource *pData,
  int iKey,
  int *pRc
){
  void *pKey; int nKey;
  void *pVal; int nVal;
  testDatasourceEntry(pData, iKey, &pKey, &nKey, &pVal, &nVal);
  testOomFetch(pOom, pDb, pKey, nKey, pVal, nVal, pRc);
}

static void testOomWriteStr(
  OomTest *pOom,
  lsm_db *pDb,
  const char *zKey,
  const char *zVal,
  int *pRc
){
  int nKey = strlen(zKey);
  int nVal = strlen(zVal);
  testOomWrite(pOom, pDb, (void *)zKey, nKey, (void *)zVal, nVal, pRc);
}

static void testOomWriteData(
  OomTest *pOom,
  lsm_db *pDb,
  Datasource *pData,
  int iKey,
  int *pRc
){
  void *pKey; int nKey;
  void *pVal; int nVal;
  testDatasourceEntry(pData, iKey, &pKey, &nKey, &pVal, &nVal);
  testOomWrite(pOom, pDb, pKey, nKey, pVal, nVal, pRc);
}

static void testOomScan(
  OomTest *pOom, 
  lsm_db *pDb, 
  int bReverse,
  const void *pKey, int nKey,
  int nScan,
  int *pRc
){
  if( *pRc==0 ){
    int rc;
    int iScan = 0;
    lsm_cursor *pCsr;
    int (*xAdvance)(lsm_cursor *) = 0;
    

    rc = lsm_csr_open(pDb, &pCsr);
    testOomAssertRc(pOom, rc);

    if( rc==LSM_OK ){
      if( bReverse ){
        rc = lsm_csr_seek(pCsr, pKey, nKey, LSM_SEEK_LE);
        xAdvance = lsm_csr_prev;
      }else{
        rc = lsm_csr_seek(pCsr, pKey, nKey, LSM_SEEK_GE);
        xAdvance = lsm_csr_next;
      }
    }
    testOomAssertRc(pOom, rc);

    while( rc==LSM_OK && lsm_csr_valid(pCsr) && iScan<nScan ){
      const void *p; int n;

      rc = lsm_csr_key(pCsr, &p, &n);
      testOomAssertRc(pOom, rc);
      if( rc==LSM_OK ){
        rc = lsm_csr_value(pCsr, &p, &n);
        testOomAssertRc(pOom, rc);
      }
      if( rc==LSM_OK ){
        rc = xAdvance(pCsr);
        testOomAssertRc(pOom, rc);
      }
      iScan++;
    }

    lsm_csr_close(pCsr);
    *pRc = rc;
  }
}

#define LSMTEST6_TESTDB "testdb.lsm" 

void testDeleteLsmdb(const char *zFile){
  char *zLog = testMallocPrintf("%s-log", zFile);
  char *zShm = testMallocPrintf("%s-shm", zFile);
  unlink(zFile);
  unlink(zLog);
  unlink(zShm);
  testFree(zLog);
  testFree(zShm);
}

static void copy_file(const char *zFrom, const char *zTo, int isDatabase){

  if( access(zFrom, F_OK) ){
    unlink(zTo);
  }else{
    int fd1;
    int fd2;
    off_t sz;
    off_t i;
    struct stat buf;
    u8 *aBuf;

    fd1 = open(zFrom, O_RDONLY | _O_BINARY, 0644);
    fd2 = open(zTo, O_RDWR | O_CREAT | _O_BINARY, 0644);

    fstat(fd1, &buf);
    sz = buf.st_size;
    ftruncate(fd2, sz);

    aBuf = testMalloc(4096);
    for(i=0; i<sz; i+=4096){
      int bLockPage = isDatabase && i == 0;
      int nByte = MIN((bLockPage ? 4066 : 4096), sz - i);
      memset(aBuf, 0, 4096);
      read(fd1, aBuf, nByte);
      write(fd2, aBuf, nByte);
      if( bLockPage ){
        lseek(fd1, 4096, SEEK_SET);
        lseek(fd2, 4096, SEEK_SET);
      }
    }
    testFree(aBuf);

    close(fd1);
    close(fd2);
  }
}

void testCopyLsmdb(const char *zFrom, const char *zTo){
  char *zLog1 = testMallocPrintf("%s-log", zFrom);
  char *zLog2 = testMallocPrintf("%s-log", zTo);
  char *zShm1 = testMallocPrintf("%s-shm", zFrom);
  char *zShm2 = testMallocPrintf("%s-shm", zTo);

  unlink(zShm2);
  unlink(zLog2);
  unlink(zTo);
  copy_file(zFrom, zTo, 1);
  copy_file(zLog1, zLog2, 0);
  copy_file(zShm1, zShm2, 0);

  testFree(zLog1); testFree(zLog2); testFree(zShm1); testFree(zShm2);
}

/*
** File zFile is the path to a database. This function makes backups
** of the database file and its log as follows:
**
**     cp $(zFile)         $(zFile)-save
**     cp $(zFile)-$(zAux) $(zFile)-save-$(zAux)
**
** Function testRestoreDb() can be used to copy the files back in the
** other direction.
*/
void testSaveDb(const char *zFile, const char *zAux){
  char *zLog = testMallocPrintf("%s-%s", zFile, zAux);
  char *zFileSave = testMallocPrintf("%s-save", zFile);
  char *zLogSave = testMallocPrintf("%s-%s-save", zFile, zAux);

  unlink(zFileSave);
  unlink(zLogSave);
  copy_file(zFile, zFileSave, 1);
  copy_file(zLog, zLogSave, 0);

  testFree(zLog); testFree(zFileSave); testFree(zLogSave);
}

/*
** File zFile is the path to a database. This function restores
** a backup of the database made by a previous call to testSaveDb().
** Specifically, it does the equivalent of:
**
**     cp $(zFile)-save         $(zFile)
**     cp $(zFile)-save-$(zAux) $(zFile)-$(zAux)
*/
void testRestoreDb(const char *zFile, const char *zAux){
  char *zLog = testMallocPrintf("%s-%s", zFile, zAux);
  char *zFileSave = testMallocPrintf("%s-save", zFile);
  char *zLogSave = testMallocPrintf("%s-%s-save", zFile, zAux);

  copy_file(zFileSave, zFile, 1);
  copy_file(zLogSave, zLog, 0);

  testFree(zLog); testFree(zFileSave); testFree(zLogSave);
}


static int lsmWriteStr(lsm_db *pDb, const char *zKey, const char *zVal){
  int nKey = strlen(zKey);
  int nVal = strlen(zVal);
  return lsm_insert(pDb, (void *)zKey, nKey, (void *)zVal, nVal);
}

static void setup_delete_db(void){
  testDeleteLsmdb(LSMTEST6_TESTDB);
}

/*
** Create a small database. With the following content:
**
**    "one"   -> "one"
**    "two"   -> "four"
**    "three" -> "nine"
**    "four"  -> "sixteen"
**    "five"  -> "twentyfive"
**    "six"   -> "thirtysix"
**    "seven" -> "fourtynine"
**    "eight" -> "sixtyfour"
*/
static void setup_populate_db(void){
  const char *azStr[] = {
    "one",   "one",
    "two",   "four",
    "three", "nine",
    "four",  "sixteen",
    "five",  "twentyfive",
    "six",   "thirtysix",
    "seven", "fourtynine",
    "eight", "sixtyfour",
  };
  int rc;
  int ii;
  lsm_db *pDb;

  testDeleteLsmdb(LSMTEST6_TESTDB);

  rc = lsm_new(tdb_lsm_env(), &pDb);
  if( rc==LSM_OK ) rc = lsm_open(pDb, LSMTEST6_TESTDB);

  for(ii=0; rc==LSM_OK && ii<ArraySize(azStr); ii+=2){
    rc = lsmWriteStr(pDb, azStr[ii], azStr[ii+1]);
  }
  lsm_close(pDb);

  testSaveDb(LSMTEST6_TESTDB, "log");
  assert( rc==LSM_OK );
}

static Datasource *getDatasource(void){
  const DatasourceDefn defn = { TEST_DATASOURCE_RANDOM, 10, 15, 200, 250 };
  return testDatasourceNew(&defn);
}

/*
** Set up a database file with the following properties:
**
**   * Page size is 1024 bytes.
**   * Block size is 64 KB.
**   * Contains 5000 key-value pairs starting at 0 from the
**     datasource returned getDatasource().
*/
static void setup_populate_db2(void){
  Datasource *pData;
  int ii;
  int rc;
  int nBlocksize = 64*1024;
  int nPagesize = 1024;
  int nWritebuffer = 4*1024;
  lsm_db *pDb;

  testDeleteLsmdb(LSMTEST6_TESTDB);
  rc = lsm_new(tdb_lsm_env(), &pDb);
  if( rc==LSM_OK ) rc = lsm_open(pDb, LSMTEST6_TESTDB);

  lsm_config(pDb, LSM_CONFIG_BLOCK_SIZE, &nBlocksize); 
  lsm_config(pDb, LSM_CONFIG_PAGE_SIZE, &nPagesize); 
  lsm_config(pDb, LSM_CONFIG_AUTOFLUSH, &nWritebuffer); 

  pData = getDatasource();
  for(ii=0; rc==LSM_OK && ii<5000; ii++){
    void *pKey; int nKey;
    void *pVal; int nVal;
    testDatasourceEntry(pData, ii, &pKey, &nKey, &pVal, &nVal);
    lsm_insert(pDb, pKey, nKey, pVal, nVal);
  }
  testDatasourceFree(pData);
  lsm_close(pDb);

  testSaveDb(LSMTEST6_TESTDB, "log");
  assert( rc==LSM_OK );
}

/*
** Test the results of OOM conditions in lsm_new().
*/
static void simple_oom_1(OomTest *pOom){
  int rc;
  lsm_db *pDb;

  rc = lsm_new(tdb_lsm_env(), &pDb);
  testOomAssertRc(pOom, rc);

  lsm_close(pDb);
}

/*
** Test the results of OOM conditions in lsm_open().
*/
static void simple_oom_2(OomTest *pOom){
  int rc;
  lsm_db *pDb;

  rc = lsm_new(tdb_lsm_env(), &pDb);
  if( rc==LSM_OK ){
    rc = lsm_open(pDb, "testdb.lsm");
  }
  testOomAssertRc(pOom, rc);

  lsm_close(pDb);
}

/*
** Test the results of OOM conditions in simple fetch operations.
*/
static void simple_oom_3(OomTest *pOom){
  int rc = LSM_OK;
  lsm_db *pDb;

  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb, &rc);

  testOomFetchStr(pOom, pDb, "four",  "sixteen",    &rc);
  testOomFetchStr(pOom, pDb, "seven", "fourtynine", &rc);
  testOomFetchStr(pOom, pDb, "one",   "one",        &rc);
  testOomFetchStr(pOom, pDb, "eight", "sixtyfour",  &rc);

  lsm_close(pDb);
}

/*
** Test the results of OOM conditions in simple write operations.
*/
static void simple_oom_4(OomTest *pOom){
  int rc = LSM_OK;
  lsm_db *pDb;

  testDeleteLsmdb(LSMTEST6_TESTDB);
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb, &rc);

  testOomWriteStr(pOom, pDb, "123", "onetwothree", &rc);
  testOomWriteStr(pOom, pDb, "456", "fourfivesix", &rc);
  testOomWriteStr(pOom, pDb, "789", "seveneightnine", &rc);
  testOomWriteStr(pOom, pDb, "123", "teneleventwelve", &rc);
  testOomWriteStr(pOom, pDb, "456", "fourteenfifteensixteen", &rc);

  lsm_close(pDb);
}

static void simple_oom_5(OomTest *pOom){
  Datasource *pData = getDatasource();
  int rc = LSM_OK;
  lsm_db *pDb;

  testRestoreDb(LSMTEST6_TESTDB, "log");
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb, &rc);

  testOomFetchData(pOom, pDb, pData, 3333, &rc);
  testOomFetchData(pOom, pDb, pData, 0, &rc);
  testOomFetchData(pOom, pDb, pData, 4999, &rc);

  lsm_close(pDb);
  testDatasourceFree(pData);
}

static void simple_oom_6(OomTest *pOom){
  Datasource *pData = getDatasource();
  int rc = LSM_OK;
  lsm_db *pDb;

  testRestoreDb(LSMTEST6_TESTDB, "log");
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb, &rc);

  testOomWriteData(pOom, pDb, pData, 5000, &rc);
  testOomWriteData(pOom, pDb, pData, 5001, &rc);
  testOomWriteData(pOom, pDb, pData, 5002, &rc);
  testOomFetchData(pOom, pDb, pData, 5001, &rc);
  testOomFetchData(pOom, pDb, pData, 1234, &rc);

  lsm_close(pDb);
  testDatasourceFree(pData);
}

static void simple_oom_7(OomTest *pOom){
  Datasource *pData = getDatasource();
  int rc = LSM_OK;
  lsm_db *pDb;

  testRestoreDb(LSMTEST6_TESTDB, "log");
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb, &rc);
  testOomScan(pOom, pDb, 0, "abc", 3, 20, &rc);
  lsm_close(pDb);
  testDatasourceFree(pData);
}

static void simple_oom_8(OomTest *pOom){
  Datasource *pData = getDatasource();
  int rc = LSM_OK;
  lsm_db *pDb;
  testRestoreDb(LSMTEST6_TESTDB, "log");
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb, &rc);
  testOomScan(pOom, pDb, 1, "xyz", 3, 20, &rc);
  lsm_close(pDb);
  testDatasourceFree(pData);
}

/*
** This test case has two clients connected to a database. The first client
** hits an OOM while writing to the database. Check that the second 
** connection is still able to query the db following the OOM.
*/
static void simple_oom2_1(OomTest *pOom){
  const int nRecord = 100;        /* Number of records initially in db */
  const int nIns = 10;            /* Number of records inserted with OOM */

  Datasource *pData = getDatasource();
  int rc = LSM_OK;
  lsm_db *pDb1;
  lsm_db *pDb2;
  int i;

  testDeleteLsmdb(LSMTEST6_TESTDB);

  /* Open the two connections. Initialize the in-memory tree so that it
  ** contains 100 records. Do all this with OOM injection disabled. */
  testOomEnable(pOom, 0);
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb1, &rc);
  testOomOpen(pOom, LSMTEST6_TESTDB, &pDb2, &rc);
  for(i=0; i<nRecord; i++){
    testOomWriteData(pOom, pDb1, pData, i, &rc);
  }
  testOomEnable(pOom, 1);
  assert( rc==0 );

  /* Insert 10 more records using pDb1. Stop when an OOM is encountered. */
  for(i=nRecord; i<nRecord+nIns; i++){
    testOomWriteData(pOom, pDb1, pData, i, &rc);
    if( rc ) break;
  }
  testOomAssertRc(pOom, rc);

  /* Switch off OOM injection. Write a few rows using pDb2. Then check
  ** that the database may be successfully queried.  */
  testOomEnable(pOom, 0);
  rc = 0;
  for(; i<nRecord+nIns && rc==0; i++){
    testOomWriteData(pOom, pDb2, pData, i, &rc);
  }
  for(i=0; i<nRecord+nIns; i++) testOomFetchData(pOom, pDb2, pData, i, &rc);
  testOomEnable(pOom, 1);

  lsm_close(pDb1);
  lsm_close(pDb2);
  testDatasourceFree(pData);
}


static void do_test_oom1(const char *zPattern, int *pRc){
  struct SimpleOom {
    const char *zName;
    void (*xSetup)(void);
    void (*xFunc)(OomTest *);
  } aSimple[] = {
    { "oom1.lsm.1", setup_delete_db,    simple_oom_1 },
    { "oom1.lsm.2", setup_delete_db,    simple_oom_2 },
    { "oom1.lsm.3", setup_populate_db,  simple_oom_3 },
    { "oom1.lsm.4", setup_delete_db,    simple_oom_4 },
    { "oom1.lsm.5", setup_populate_db2, simple_oom_5 },
    { "oom1.lsm.6", setup_populate_db2, simple_oom_6 },
    { "oom1.lsm.7", setup_populate_db2, simple_oom_7 },
    { "oom1.lsm.8", setup_populate_db2, simple_oom_8 },

    { "oom2.lsm.1", setup_delete_db,    simple_oom2_1 },
  };
  int i;

  for(i=0; i<ArraySize(aSimple); i++){
    if( *pRc==0 && testCaseBegin(pRc, zPattern, "%s", aSimple[i].zName) ){
      OomTest t;

      if( aSimple[i].xSetup ){
        aSimple[i].xSetup();
      }

      for(testOomStart(&t); testOomContinue(&t); testOomNext(&t)){
        aSimple[i].xFunc(&t);
      }

      printf("(%d injections).", t.iNext-2);
      testCaseFinish( (*pRc = testOomFinish(&t)) );
      testMallocOom(tdb_lsm_env(), 0, 0, 0, 0);
    }
  }
}

void test_oom(
  const char *zPattern,           /* Run test cases that match this pattern */
  int *pRc                        /* IN/OUT: Error code */
){
  do_test_oom1(zPattern, pRc);
}
