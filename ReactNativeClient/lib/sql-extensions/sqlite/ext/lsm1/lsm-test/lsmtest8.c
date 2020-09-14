
/*
** This file contains test cases to verify that "live-recovery" following
** a mid-transaction failure of a writer process.
*/


/* 
** This test file includes lsmInt.h to get access to the definition of the
** ShmHeader structure. This is required to cause strategic damage to the
** shared memory header as part of recovery testing.
*/
#include "lsmInt.h"

#include "lsmtest.h"

typedef struct SetupStep SetupStep;
struct SetupStep {
  int bFlush;                     /* Flush to disk and checkpoint */
  int iInsStart;                  /* First key-value from ds to insert */
  int nIns;                       /* Number of rows to insert */
  int iDelStart;                  /* First key from ds to delete */
  int nDel;                       /* Number of rows to delete */
};

static void doSetupStep(
  TestDb *pDb, 
  Datasource *pData, 
  const SetupStep *pStep, 
  int *pRc
){
  testWriteDatasourceRange(pDb, pData, pStep->iInsStart, pStep->nIns, pRc);
  testDeleteDatasourceRange(pDb, pData, pStep->iDelStart, pStep->nDel, pRc);
  if( *pRc==0 ){
    int nSave = -1;
    int nBuf = 64;
    lsm_db *db = tdb_lsm(pDb);

    lsm_config(db, LSM_CONFIG_AUTOFLUSH, &nSave);
    lsm_config(db, LSM_CONFIG_AUTOFLUSH, &nBuf);
    lsm_begin(db, 1);
    lsm_commit(db, 0);
    lsm_config(db, LSM_CONFIG_AUTOFLUSH, &nSave);

    *pRc = lsm_work(db, 0, 0, 0);
    if( *pRc==0 ){
      *pRc = lsm_checkpoint(db, 0);
    }
  }
}

static void doSetupStepArray(
  TestDb *pDb, 
  Datasource *pData, 
  const SetupStep *aStep, 
  int nStep
){
  int i;
  for(i=0; i<nStep; i++){
    int rc = 0;
    doSetupStep(pDb, pData, &aStep[i], &rc);
    assert( rc==0 );
  }
}

static void setupDatabase1(TestDb *pDb, Datasource **ppData){
  const SetupStep aStep[] = {
    { 0,                                  1,     2000, 0, 0 },
    { 1,                                  0,     0, 0, 0 },
    { 0,                                  10001, 1000, 0, 0 },
  };
  const DatasourceDefn defn = {TEST_DATASOURCE_RANDOM, 12, 16, 100, 500};
  Datasource *pData;

  pData = testDatasourceNew(&defn);
  doSetupStepArray(pDb, pData, aStep, ArraySize(aStep));
  if( ppData ){
    *ppData = pData;
  }else{
    testDatasourceFree(pData);
  }
}

#include <stdio.h>
void testReadFile(const char *zFile, int iOff, void *pOut, int nByte, int *pRc){
  if( *pRc==0 ){
    FILE *fd;
    fd = fopen(zFile, "rb");
    if( fd==0 ){
      *pRc = 1;
    }else{
      if( 0!=fseek(fd, iOff, SEEK_SET) ){
        *pRc = 1;
      }else{
        assert( nByte>=0 );
        if( (size_t)nByte!=fread(pOut, 1, nByte, fd) ){
          *pRc = 1;
        }
      }
      fclose(fd);
    }
  }
}

void testWriteFile(
  const char *zFile, 
  int iOff, 
  void *pOut, 
  int nByte, 
  int *pRc
){
  if( *pRc==0 ){
    FILE *fd;
    fd = fopen(zFile, "r+b");
    if( fd==0 ){
      *pRc = 1;
    }else{
      if( 0!=fseek(fd, iOff, SEEK_SET) ){
        *pRc = 1;
      }else{
        assert( nByte>=0 );
        if( (size_t)nByte!=fwrite(pOut, 1, nByte, fd) ){
          *pRc = 1;
        }
      }
      fclose(fd);
    }
  }
}

static ShmHeader *getShmHeader(const char *zDb){
  int rc = 0;
  char *zShm = testMallocPrintf("%s-shm", zDb);
  ShmHeader *pHdr;

  pHdr = testMalloc(sizeof(ShmHeader));
  testReadFile(zShm, 0, (void *)pHdr, sizeof(ShmHeader), &rc);
  assert( rc==0 );

  return pHdr;
}

/*
** This function makes a copy of the three files associated with LSM 
** database zDb (i.e. if zDb is "test.db", it makes copies of "test.db",
** "test.db-log" and "test.db-shm").
**
** It then opens a new database connection to the copy with the xLock() call
** instrumented so that it appears that some other process already connected
** to the db (holding a shared lock on DMS2). This prevents recovery from
** running. Then:
**
**    1) Check that the checksum of the database is zCksum. 
**    2) Write a few keys to the database. Then delete the same keys. 
**    3) Check that the checksum is zCksum.
**    4) Flush the db to disk and run a checkpoint. 
**    5) Check once more that the checksum is still zCksum.
*/
static void doLiveRecovery(const char *zDb, const char *zCksum, int *pRc){
  if( *pRc==LSM_OK ){
    const DatasourceDefn defn = {TEST_DATASOURCE_RANDOM, 20, 25, 100, 500};
    Datasource *pData;
    const char *zCopy = "testcopy.lsm";
    char zCksum2[TEST_CKSUM_BYTES];
    TestDb *pDb = 0;
    int rc;

    pData = testDatasourceNew(&defn);

    testCopyLsmdb(zDb, zCopy);
    rc = tdb_lsm_open("test_no_recovery=1", zCopy, 0, &pDb);
    if( rc==0 ){
      ShmHeader *pHdr;
      lsm_db *db;
      testCksumDatabase(pDb, zCksum2);
      testCompareStr(zCksum, zCksum2, &rc);

      testWriteDatasourceRange(pDb, pData, 1, 10, &rc);
      testDeleteDatasourceRange(pDb, pData, 1, 10, &rc);

      /* Test that the two tree-headers are now consistent. */
      pHdr = getShmHeader(zCopy);
      if( rc==0 && memcmp(&pHdr->hdr1, &pHdr->hdr2, sizeof(pHdr->hdr1)) ){
        rc = 1;
      }
      testFree(pHdr);

      if( rc==0 ){
        int nBuf = 64;
        db = tdb_lsm(pDb);
        lsm_config(db, LSM_CONFIG_AUTOFLUSH, &nBuf);
        lsm_begin(db, 1);
        lsm_commit(db, 0);
        rc = lsm_work(db, 0, 0, 0);
      }

      testCksumDatabase(pDb, zCksum2);
      testCompareStr(zCksum, zCksum2, &rc);
    }

    testDatasourceFree(pData);
    testClose(&pDb);
    testDeleteLsmdb(zCopy);
    *pRc = rc;
  }
}

static void doWriterCrash1(int *pRc){
  const int nWrite = 2000;
  const int nStep = 10;
  const int iWriteStart = 20000;
  int rc = 0;
  TestDb *pDb = 0;
  Datasource *pData = 0;

  rc = tdb_lsm_open("autowork=0", "testdb.lsm", 1, &pDb);
  if( rc==0 ){
    int iDot = 0;
    char zCksum[TEST_CKSUM_BYTES];
    int i;
    setupDatabase1(pDb, &pData);
    testCksumDatabase(pDb, zCksum);
    testBegin(pDb, 2, &rc);
    for(i=0; rc==0 && i<nWrite; i+=nStep){
      testCaseProgress(i, nWrite, testCaseNDot(), &iDot);
      testWriteDatasourceRange(pDb, pData, iWriteStart+i, nStep, &rc);
      doLiveRecovery("testdb.lsm", zCksum, &rc);
    }
  }
  testCommit(pDb, 0, &rc);
  testClose(&pDb);
  testDatasourceFree(pData);
  *pRc = rc;
}

/*
** This test case verifies that inconsistent tree-headers in shared-memory
** are resolved correctly. 
*/
static void doWriterCrash2(int *pRc){
  int rc = 0;
  TestDb *pDb = 0;
  Datasource *pData = 0;

  rc = tdb_lsm_open("autowork=0", "testdb.lsm", 1, &pDb);
  if( rc==0 ){
    ShmHeader *pHdr1;
    ShmHeader *pHdr2;
    char zCksum1[TEST_CKSUM_BYTES];
    char zCksum2[TEST_CKSUM_BYTES];

    pHdr1 = testMalloc(sizeof(ShmHeader));
    pHdr2 = testMalloc(sizeof(ShmHeader));
    setupDatabase1(pDb, &pData);

    /* Grab a copy of the shared-memory header. And the db checksum */
    testReadFile("testdb.lsm-shm", 0, (void *)pHdr1, sizeof(ShmHeader), &rc);
    testCksumDatabase(pDb, zCksum1);

    /* Modify the database */
    testBegin(pDb, 2, &rc);
    testWriteDatasourceRange(pDb, pData, 30000, 200, &rc);
    testCommit(pDb, 0, &rc);

    /* Grab a second copy of the shared-memory header. And the db checksum */
    testReadFile("testdb.lsm-shm", 0, (void *)pHdr2, sizeof(ShmHeader), &rc);
    testCksumDatabase(pDb, zCksum2);
    doLiveRecovery("testdb.lsm", zCksum2, &rc);

    /* If both tree-headers are valid, tree-header-1 is used. */
    memcpy(&pHdr2->hdr1, &pHdr1->hdr1, sizeof(pHdr1->hdr1));
    pHdr2->bWriter = 1;
    testWriteFile("testdb.lsm-shm", 0, (void *)pHdr2, sizeof(ShmHeader), &rc);
    doLiveRecovery("testdb.lsm", zCksum1, &rc);

    /* If both tree-headers are valid, tree-header-1 is used. */
    memcpy(&pHdr2->hdr1, &pHdr2->hdr2, sizeof(pHdr1->hdr1));
    memcpy(&pHdr2->hdr2, &pHdr1->hdr1, sizeof(pHdr1->hdr1));
    pHdr2->bWriter = 1;
    testWriteFile("testdb.lsm-shm", 0, (void *)pHdr2, sizeof(ShmHeader), &rc);
    doLiveRecovery("testdb.lsm", zCksum2, &rc);

    /* If tree-header 1 is invalid, tree-header-2 is used */
    memcpy(&pHdr2->hdr2, &pHdr2->hdr1, sizeof(pHdr1->hdr1));
    pHdr2->hdr1.aCksum[0] = 5;
    pHdr2->hdr1.aCksum[0] = 6;
    pHdr2->bWriter = 1;
    testWriteFile("testdb.lsm-shm", 0, (void *)pHdr2, sizeof(ShmHeader), &rc);
    doLiveRecovery("testdb.lsm", zCksum2, &rc);

    /* If tree-header 2 is invalid, tree-header-1 is used */
    memcpy(&pHdr2->hdr1, &pHdr2->hdr2, sizeof(pHdr1->hdr1));
    pHdr2->hdr2.aCksum[0] = 5;
    pHdr2->hdr2.aCksum[0] = 6;
    pHdr2->bWriter = 1;
    testWriteFile("testdb.lsm-shm", 0, (void *)pHdr2, sizeof(ShmHeader), &rc);
    doLiveRecovery("testdb.lsm", zCksum2, &rc);

    testFree(pHdr1);
    testFree(pHdr2);
    testClose(&pDb);
  }

  *pRc = rc;
}

void do_writer_crash_test(const char *zPattern, int *pRc){
  struct Test {
    const char *zName;
    void (*xFunc)(int *);
  } aTest[] = {
    { "writercrash1.lsm", doWriterCrash1 },
    { "writercrash2.lsm", doWriterCrash2 },
  };
  int i;
  for(i=0; i<ArraySize(aTest); i++){
    struct Test *p = &aTest[i];
    if( testCaseBegin(pRc, zPattern, p->zName) ){
      p->xFunc(pRc);
      testCaseFinish(*pRc);
    }
  }

}
