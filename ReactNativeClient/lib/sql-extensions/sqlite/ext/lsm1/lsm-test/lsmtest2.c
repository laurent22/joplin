
/*
** This file contains tests related to recovery following application 
** and system crashes (power failures) while writing to the database.
*/

#include "lsmtest.h"

/*
** Structure used by testCksumDatabase() to accumulate checksum values in.
*/
typedef struct Cksum Cksum;
struct Cksum {
  int nRow;
  int cksum1;
  int cksum2;
};

/*
** tdb_scan() callback used by testCksumDatabase()
*/
static void scanCksumDb(
  void *pCtx, 
  void *pKey, int nKey,
  void *pVal, int nVal
){
  Cksum *p = (Cksum *)pCtx;
  int i;

  p->nRow++;
  for(i=0; i<nKey; i++){
    p->cksum1 += ((u8 *)pKey)[i];
    p->cksum2 += p->cksum1;
  }
  for(i=0; i<nVal; i++){
    p->cksum1 += ((u8 *)pVal)[i];
    p->cksum2 += p->cksum1;
  }
}

/*
** tdb_scan() callback used by testCountDatabase()
*/
static void scanCountDb(
  void *pCtx, 
  void *pKey, int nKey,
  void *pVal, int nVal
){
  Cksum *p = (Cksum *)pCtx;
  p->nRow++;

  unused_parameter(pKey);
  unused_parameter(nKey);
  unused_parameter(pVal);
  unused_parameter(nVal);
}


/*
** Iterate through the entire contents of database pDb. Write a checksum
** string based on the db contents into buffer zOut before returning. A
** checksum string is at most 29 (TEST_CKSUM_BYTES) bytes in size:
**
**    * 32-bit integer (10 bytes)
**    * 1 space        (1 byte)
**    * 32-bit hex     (8 bytes)
**    * 1 space        (1 byte)
**    * 32-bit hex     (8 bytes)
**    * nul-terminator (1 byte)
**
** The number of entries in the database is returned.
*/
int testCksumDatabase(
  TestDb *pDb,                    /* Database handle */
  char *zOut                      /* Buffer to write checksum to */
){
  Cksum cksum;
  memset(&cksum, 0, sizeof(Cksum));
  tdb_scan(pDb, (void *)&cksum, 0, 0, 0, 0, 0, scanCksumDb);
  sprintf(zOut, "%d %x %x", 
      cksum.nRow, (u32)cksum.cksum1, (u32)cksum.cksum2
  );
  assert( strlen(zOut)<TEST_CKSUM_BYTES );
  return cksum.nRow;
}

int testCountDatabase(TestDb *pDb){
  Cksum cksum;
  memset(&cksum, 0, sizeof(Cksum));
  tdb_scan(pDb, (void *)&cksum, 0, 0, 0, 0, 0, scanCountDb);
  return cksum.nRow;
}

/*
** This function is a no-op if *pRc is not 0 when it is called.
**
** Otherwise, the two nul-terminated strings z1 and z1 are compared. If
** they are the same, the function returns without doing anything. Otherwise,
** an error message is printed, *pRc is set to 1 and the test_failed()
** function called.
*/
void testCompareStr(const char *z1, const char *z2, int *pRc){
  if( *pRc==0 ){
    if( strcmp(z1, z2) ){
      testPrintError("testCompareStr: \"%s\" != \"%s\"\n", z1, z2);
      *pRc = 1;
      test_failed();
    }
  }
}

/*
** This function is a no-op if *pRc is not 0 when it is called.
**
** Otherwise, the two integers i1 and i2 are compared. If they are equal,
** the function returns without doing anything. Otherwise, an error message 
** is printed, *pRc is set to 1 and the test_failed() function called.
*/
void testCompareInt(int i1, int i2, int *pRc){
  if( *pRc==0 && i1!=i2 ){
    testPrintError("testCompareInt: %d != %d\n", i1, i2);
    *pRc = 1;
    test_failed();
  }
}

void testCaseStart(int *pRc, char *zFmt, ...){
  va_list ap;
  va_start(ap, zFmt);
  vprintf(zFmt, ap);
  printf(" ...");
  va_end(ap);
  *pRc = 0;
  fflush(stdout);
}

/*
** This function is a no-op if *pRc is non-zero when it is called. Zero
** is returned in this case.
**
** Otherwise, the zFmt (a printf style format string) and following arguments 
** are used to create a test case name. If zPattern is NULL or a glob pattern
** that matches the test case name, 1 is returned and the test case started.
** Otherwise, zero is returned and the test case does not start.
*/
int testCaseBegin(int *pRc, const char *zPattern, const char *zFmt, ...){
  int res = 0;
  if( *pRc==0 ){
    char *zTest;
    va_list ap;

    va_start(ap, zFmt);
    zTest = testMallocVPrintf(zFmt, ap);
    va_end(ap);
    if( zPattern==0 || testGlobMatch(zPattern, zTest) ){
      printf("%-50s ...", zTest);
      res = 1;
    }
    testFree(zTest);
    fflush(stdout);
  }

  return res;
}

void testCaseFinish(int rc){
  if( rc==0 ){
    printf("Ok\n");
  }else{
    printf("FAILED\n");
  }
  fflush(stdout);
}

void testCaseSkip(){
  printf("Skipped\n");
}

void testSetupSavedLsmdb(
  const char *zCfg,
  const char *zFile,
  Datasource *pData,
  int nRow,
  int *pRc
){
  if( *pRc==0 ){
    int rc;
    TestDb *pDb;
    rc = tdb_lsm_open(zCfg, zFile, 1, &pDb);
    if( rc==0 ){
      testWriteDatasourceRange(pDb, pData, 0, nRow, &rc);
      testClose(&pDb);
      if( rc==0 ) testSaveDb(zFile, "log");
    }
    *pRc = rc;
  }
}

/*
** This function is a no-op if *pRc is non-zero when it is called.
**
** Open the LSM database identified by zFile and compute its checksum
** (a string, as returned by testCksumDatabase()). If the checksum is
** identical to zExpect1 or, if it is not NULL, zExpect2, the test passes.
** Otherwise, print an error message and set *pRc to 1.
*/
static void testCompareCksumLsmdb(
  const char *zFile,              /* Path to LSM database */
  int bCompress,                  /* True if db is compressed */
  const char *zExpect1,           /* Expected checksum 1 */
  const char *zExpect2,           /* Expected checksum 2 (or NULL) */
  int *pRc                        /* IN/OUT: Test case error code */
){
  if( *pRc==0 ){
    char zCksum[TEST_CKSUM_BYTES];
    TestDb *pDb;

    *pRc = tdb_lsm_open((bCompress?"compression=1 mmap=0":""), zFile, 0, &pDb);
    testCksumDatabase(pDb, zCksum);
    testClose(&pDb);

    if( *pRc==0 ){
      int r1 = 0;
      int r2 = -1;

      r1 = strcmp(zCksum, zExpect1);
      if( zExpect2 ) r2 = strcmp(zCksum, zExpect2);
      if( r1 && r2 ){
        if( zExpect2 ){
          testPrintError("testCompareCksumLsmdb: \"%s\" != (\"%s\" OR \"%s\")",
              zCksum, zExpect1, zExpect2
          );
        }else{
          testPrintError("testCompareCksumLsmdb: \"%s\" != \"%s\"",
              zCksum, zExpect1
          );
        }
        *pRc = 1;
        test_failed();
      }
    }
  }
}

#if 0 /* not used */
static void testCompareCksumBtdb(
  const char *zFile,              /* Path to LSM database */
  const char *zExpect1,           /* Expected checksum 1 */
  const char *zExpect2,           /* Expected checksum 2 (or NULL) */
  int *pRc                        /* IN/OUT: Test case error code */
){
  if( *pRc==0 ){
    char zCksum[TEST_CKSUM_BYTES];
    TestDb *pDb;

    *pRc = tdb_open("bt", zFile, 0, &pDb);
    testCksumDatabase(pDb, zCksum);
    testClose(&pDb);

    if( *pRc==0 ){
      int r1 = 0;
      int r2 = -1;

      r1 = strcmp(zCksum, zExpect1);
      if( zExpect2 ) r2 = strcmp(zCksum, zExpect2);
      if( r1 && r2 ){
        if( zExpect2 ){
          testPrintError("testCompareCksumLsmdb: \"%s\" != (\"%s\" OR \"%s\")",
              zCksum, zExpect1, zExpect2
          );
        }else{
          testPrintError("testCompareCksumLsmdb: \"%s\" != \"%s\"",
              zCksum, zExpect1
          );
        }
        *pRc = 1;
        test_failed();
      }
    }
  }
}
#endif /* not used */

/* Above this point are reusable test routines. Not clear that they
** should really be in this file.
*************************************************************************/

/*
** This test verifies that if a system crash occurs while doing merge work
** on the db, no data is lost.
*/
static void crash_test1(int bCompress, int *pRc){
  const char *DBNAME = "testdb.lsm";
  const DatasourceDefn defn = {TEST_DATASOURCE_RANDOM, 12, 16, 200, 200};

  const int nRow = 5000;          /* Database size */
  const int nIter = 200;          /* Number of test iterations */
  const int nWork = 20;           /* Maximum lsm_work() calls per iteration */
  const int nPage = 15;           /* Pages per lsm_work call */

  int i;
  int iDot = 0;
  Datasource *pData;
  CksumDb *pCksumDb;
  TestDb *pDb;
  char *zCfg;

  const char *azConfig[2] = {
    "page_size=1024 block_size=65536 autoflush=16384 safety=2 mmap=0", 
    "page_size=1024 block_size=65536 autoflush=16384 safety=2 "
    " compression=1 mmap=0"
  };
  assert( bCompress==0 || bCompress==1 );

  /* Allocate datasource. And calculate the expected checksums. */
  pData = testDatasourceNew(&defn);
  pCksumDb = testCksumArrayNew(pData, nRow, nRow, 1);

  /* Setup and save the initial database. */

  zCfg = testMallocPrintf("%s automerge=7", azConfig[bCompress]);
  testSetupSavedLsmdb(zCfg, DBNAME, pData, 5000, pRc);
  testFree(zCfg);

  for(i=0; i<nIter && *pRc==0; i++){
    int iWork;
    int testrc = 0;

    testCaseProgress(i, nIter, testCaseNDot(), &iDot);

    /* Restore and open the database. */
    testRestoreDb(DBNAME, "log");
    testrc = tdb_lsm_open(azConfig[bCompress], DBNAME, 0, &pDb);
    assert( testrc==0 );

    /* Call lsm_work() on the db */
    tdb_lsm_prepare_sync_crash(pDb, 1 + (i%(nWork*2)));
    for(iWork=0; testrc==0 && iWork<nWork; iWork++){
      int nWrite = 0;
      lsm_db *db = tdb_lsm(pDb);
      testrc = lsm_work(db, 0, nPage, &nWrite);
      /* assert( testrc!=0 || nWrite>0 ); */
      if( testrc==0 ) testrc = lsm_checkpoint(db, 0);
    }
    tdb_close(pDb);

    /* Check that the database content is still correct */
    testCompareCksumLsmdb(DBNAME, 
        bCompress, testCksumArrayGet(pCksumDb, nRow), 0, pRc);
  }

  testCksumArrayFree(pCksumDb);
  testDatasourceFree(pData);
}

/*
** This test verifies that if a system crash occurs while committing a
** transaction to the log file, no earlier transactions are lost or damaged.
*/
static void crash_test2(int bCompress, int *pRc){
  const char *DBNAME = "testdb.lsm";
  const DatasourceDefn defn = {TEST_DATASOURCE_RANDOM, 12, 16, 1000, 1000};

  const int nIter = 200;
  const int nInsert = 20;

  int i;
  int iDot = 0;
  Datasource *pData;
  CksumDb *pCksumDb;
  TestDb *pDb;

  /* Allocate datasource. And calculate the expected checksums. */
  pData = testDatasourceNew(&defn);
  pCksumDb = testCksumArrayNew(pData, 100, 100+nInsert, 1);

  /* Setup and save the initial database. */
  testSetupSavedLsmdb("", DBNAME, pData, 100, pRc);

  for(i=0; i<nIter && *pRc==0; i++){
    int iIns;
    int testrc = 0;

    testCaseProgress(i, nIter, testCaseNDot(), &iDot);

    /* Restore and open the database. */
    testRestoreDb(DBNAME, "log");
    testrc = tdb_lsm_open("safety=2", DBNAME, 0, &pDb);
    assert( testrc==0 );

    /* Insert nInsert records into the database. Crash midway through. */
    tdb_lsm_prepare_sync_crash(pDb, 1 + (i%(nInsert+2)));
    for(iIns=0; iIns<nInsert; iIns++){
      void *pKey; int nKey;
      void *pVal; int nVal;

      testDatasourceEntry(pData, 100+iIns, &pKey, &nKey, &pVal, &nVal);
      testrc = tdb_write(pDb, pKey, nKey, pVal, nVal);
      if( testrc ) break;
    }
    tdb_close(pDb);

    /* Check that no data was lost when the system crashed. */
    testCompareCksumLsmdb(DBNAME, bCompress,
      testCksumArrayGet(pCksumDb, 100 + iIns),
      testCksumArrayGet(pCksumDb, 100 + iIns + 1),
      pRc
    );
  }

  testDatasourceFree(pData);
  testCksumArrayFree(pCksumDb);
}


/*
** This test verifies that if a system crash occurs when checkpointing
** the database, data is not lost (assuming that any writes not synced
** to the db have been synced into the log file).
*/
static void crash_test3(int bCompress, int *pRc){
  const char *DBNAME = "testdb.lsm";
  const int nIter = 100;
  const DatasourceDefn defn = {TEST_DATASOURCE_RANDOM, 12, 16, 1000, 1000};

  int i;
  int iDot = 0;
  Datasource *pData;
  CksumDb *pCksumDb;
  TestDb *pDb;

  /* Allocate datasource. And calculate the expected checksums. */
  pData = testDatasourceNew(&defn);
  pCksumDb = testCksumArrayNew(pData, 110, 150, 10);

  /* Setup and save the initial database. */
  testSetupSavedLsmdb("", DBNAME, pData, 100, pRc);

  for(i=0; i<nIter && *pRc==0; i++){
    int iOpen;
    testCaseProgress(i, nIter, testCaseNDot(), &iDot);
    testRestoreDb(DBNAME, "log");

    for(iOpen=0; iOpen<5; iOpen++){
      /* Open the database. Insert 10 more records. */
      pDb = testOpen("lsm", 0, pRc);
      testWriteDatasourceRange(pDb, pData, 100+iOpen*10, 10, pRc);

      /* Schedule a crash simulation then close the db. */
      tdb_lsm_prepare_sync_crash(pDb, 1 + (i%2));
      tdb_close(pDb);

      /* Open the database and check that the crash did not cause any
      ** data loss.  */
      testCompareCksumLsmdb(DBNAME, bCompress,
        testCksumArrayGet(pCksumDb, 110 + iOpen*10), 0,
        pRc
      );
    }
  }

  testDatasourceFree(pData);
  testCksumArrayFree(pCksumDb);
}

void do_crash_test(const char *zPattern, int *pRc){
  struct Test {
    const char *zTest;
    void (*x)(int, int *);
    int bCompress;
  } aTest [] = {
    { "crash.lsm.1",     crash_test1, 0 },
#ifdef HAVE_ZLIB
    { "crash.lsm_zip.1", crash_test1, 1 },
#endif
    { "crash.lsm.2",     crash_test2, 0 },
    { "crash.lsm.3",     crash_test3, 0 },
  };
  int i;

  for(i=0; *pRc==LSM_OK && i<ArraySize(aTest); i++){
    struct Test *p = &aTest[i];
    if( testCaseBegin(pRc, zPattern, "%s", p->zTest) ){
      p->x(p->bCompress, pRc);
      testCaseFinish(*pRc);
    }
  }
}
