/*
** 2014 December 9
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
**
*/


/*
** Thread 1. CREATE and DROP a table.
*/
static char *stress_thread_1(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    sql_script(&err, &db, "CREATE TABLE IF NOT EXISTS t1(a PRIMARY KEY, b)");
    clear_error(&err, SQLITE_LOCKED);
    sql_script(&err, &db, "DROP TABLE IF EXISTS t1");
    clear_error(&err, SQLITE_LOCKED);
  }
  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}

/*
** Thread 2. Open and close database connections.
*/
static char *stress_thread_2(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  while( !timetostop(&err) ){
    opendb(&err, &db, "test.db", 0);
    sql_script(&err, &db, "SELECT * FROM sqlite_schema;");
    clear_error(&err, SQLITE_LOCKED);
    closedb(&err, &db);
  }
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}

/*
** Thread 3. Attempt many small SELECT statements.
*/
static char *stress_thread_3(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */

  int i1 = 0;
  int i2 = 0;

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    sql_script(&err, &db, "SELECT * FROM t1 ORDER BY a;");
    i1++;
    if( err.rc ) i2++;
    clear_error(&err, SQLITE_LOCKED);
    clear_error(&err, SQLITE_ERROR);
  }
  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("read t1 %d/%d attempts", i2, i1);
}

/*
** Thread 5. Attempt INSERT statements.
*/
static char *stress_thread_4(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int i1 = 0;
  int i2 = 0;
  int iArg = PTR2INT(pArg);

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    if( iArg ){
      closedb(&err, &db);
      opendb(&err, &db, "test.db", 0);
    }
    sql_script(&err, &db, 
        "WITH loop(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM loop LIMIT 200) "
        "INSERT INTO t1 VALUES(randomblob(60), randomblob(60));"
    );
    i1++;
    if( err.rc ) i2++;
    clear_error(&err, SQLITE_LOCKED);
    clear_error(&err, SQLITE_ERROR);
  }
  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("wrote t1 %d/%d attempts", i2, i1);
}

/*
** Thread 6. Attempt DELETE operations.
*/
static char *stress_thread_5(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int iArg = PTR2INT(pArg);

  int i1 = 0;
  int i2 = 0;

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    i64 i = (i1 % 4);
    if( iArg ){
      closedb(&err, &db);
      opendb(&err, &db, "test.db", 0);
    }
    execsql(&err, &db, "DELETE FROM t1 WHERE (rowid % 4)==:i", &i);
    i1++;
    if( err.rc ) i2++;
    clear_error(&err, SQLITE_LOCKED);
  }
  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("deleted from t1 %d/%d attempts", i2, i1);
}


static void stress1(int nMs){
  Error err = {0};
  Threadset threads = {0};

  setstoptime(&err, nMs);
  sqlite3_enable_shared_cache(1);

  launch_thread(&err, &threads, stress_thread_1, 0);
  launch_thread(&err, &threads, stress_thread_1, 0);

  launch_thread(&err, &threads, stress_thread_2, 0);
  launch_thread(&err, &threads, stress_thread_2, 0);

  launch_thread(&err, &threads, stress_thread_3, 0);
  launch_thread(&err, &threads, stress_thread_3, 0);

  launch_thread(&err, &threads, stress_thread_4, 0);
  launch_thread(&err, &threads, stress_thread_4, 0);

  launch_thread(&err, &threads, stress_thread_5, 0);
  launch_thread(&err, &threads, stress_thread_5, (void*)1);

  join_all_threads(&err, &threads);
  sqlite3_enable_shared_cache(0);

  print_and_free_err(&err);
}

/**************************************************************************
***************************************************************************
** Start of test case "stress2"
*/



/*
** 1.  CREATE TABLE statements.
** 2.  DROP TABLE statements.
** 3.  Small SELECT statements.
** 4.  Big SELECT statements.
** 5.  Small INSERT statements.
** 6.  Big INSERT statements.
** 7.  Small UPDATE statements.
** 8.  Big UPDATE statements.
** 9.  Small DELETE statements.
** 10. Big DELETE statements.
** 11. VACUUM.
** 14. Integrity-check.
** 17. Switch the journal mode from delete to wal and back again.
** 19. Open and close database connections rapidly.
*/

#define STRESS2_TABCNT 5          /* count1 in SDS test */

#define STRESS2_COUNT2 200        /* count2 in SDS test */
#define STRESS2_COUNT3  57        /* count2 in SDS test */

static void stress2_workload1(Error *pErr, Sqlite *pDb, int i){
  int iTab = (i % (STRESS2_TABCNT-1)) + 1;
  sql_script_printf(pErr, pDb, 
      "CREATE TABLE IF NOT EXISTS t%d(x PRIMARY KEY, y, z);", iTab
  );
}

static void stress2_workload2(Error *pErr, Sqlite *pDb, int i){
  int iTab = (i % (STRESS2_TABCNT-1)) + 1;
  sql_script_printf(pErr, pDb, "DROP TABLE IF EXISTS t%d;", iTab);
}

static void stress2_workload3(Error *pErr, Sqlite *pDb, int i){
  sql_script(pErr, pDb, "SELECT * FROM t0 WHERE z = 'small'");
}

static void stress2_workload4(Error *pErr, Sqlite *pDb, int i){
  sql_script(pErr, pDb, "SELECT * FROM t0 WHERE z = 'big'");
}

static void stress2_workload5(Error *pErr, Sqlite *pDb, int i){
  sql_script(pErr, pDb,
      "INSERT INTO t0 VALUES(hex(random()), hex(randomblob(200)), 'small');"
  );
}

static void stress2_workload6(Error *pErr, Sqlite *pDb, int i){
  sql_script(pErr, pDb,
      "INSERT INTO t0 VALUES(hex(random()), hex(randomblob(57)), 'big');"
  );
}

static void stress2_workload7(Error *pErr, Sqlite *pDb, int i){
  sql_script_printf(pErr, pDb,
      "UPDATE t0 SET y = hex(randomblob(200)) "
      "WHERE x LIKE hex((%d %% 5)) AND z='small';"
      ,i
  );
}
static void stress2_workload8(Error *pErr, Sqlite *pDb, int i){
  sql_script_printf(pErr, pDb,
      "UPDATE t0 SET y = hex(randomblob(57)) "
      "WHERE x LIKE hex(%d %% 5) AND z='big';"
      ,i
  );
}

static void stress2_workload9(Error *pErr, Sqlite *pDb, int i){
  sql_script_printf(pErr, pDb,
      "DELETE FROM t0 WHERE x LIKE hex(%d %% 5) AND z='small';", i
  );
}
static void stress2_workload10(Error *pErr, Sqlite *pDb, int i){
  sql_script_printf(pErr, pDb,
      "DELETE FROM t0 WHERE x LIKE hex(%d %% 5) AND z='big';", i
  );
}

static void stress2_workload11(Error *pErr, Sqlite *pDb, int i){
  sql_script(pErr, pDb, "VACUUM");
}

static void stress2_workload14(Error *pErr, Sqlite *pDb, int i){
  sql_script(pErr, pDb, "PRAGMA integrity_check");
}

static void stress2_workload17(Error *pErr, Sqlite *pDb, int i){
  sql_script_printf(pErr, pDb, 
      "PRAGMA journal_mode = %q", (i%2) ? "delete" : "wal"
  );
}

static char *stress2_workload19(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  const char *zDb = (const char*)pArg;
  while( !timetostop(&err) ){
    opendb(&err, &db, zDb, 0);
    sql_script(&err, &db, "SELECT * FROM sqlite_schema;");
    clear_error(&err, SQLITE_LOCKED);
    closedb(&err, &db);
  }
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}


typedef struct Stress2Ctx Stress2Ctx;
struct Stress2Ctx {
  const char *zDb;
  void (*xProc)(Error*, Sqlite*, int);
};

static char *stress2_thread_wrapper(int iTid, void *pArg){
  Stress2Ctx *pCtx = (Stress2Ctx*)pArg;
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int i1 = 0;
  int i2 = 0;

  while( !timetostop(&err) ){
    int cnt;
    opendb(&err, &db, pCtx->zDb, 0);
    for(cnt=0; err.rc==SQLITE_OK && cnt<STRESS2_TABCNT; cnt++){
      pCtx->xProc(&err, &db, i1);
      i2 += (err.rc==SQLITE_OK);
      clear_error(&err, SQLITE_LOCKED);
      i1++;
    }
    closedb(&err, &db);
  }

  print_and_free_err(&err);
  return sqlite3_mprintf("ok %d/%d", i2, i1);
}

static void stress2_launch_thread_loop(
  Error *pErr,                    /* IN/OUT: Error code */
  Threadset *pThreads,            /* Thread set */
  const char *zDb,                /* Database name */
  void (*x)(Error*,Sqlite*,int)   /* Run this until error or timeout */
){
  Stress2Ctx *pCtx = sqlite3_malloc(sizeof(Stress2Ctx));
  pCtx->zDb = zDb;
  pCtx->xProc = x;
  launch_thread(pErr, pThreads, stress2_thread_wrapper, (void*)pCtx);
}

static void stress2(int nMs){
  struct Stress2Task {
    void (*x)(Error*,Sqlite*,int);
  } aTask[] = {
    { stress2_workload1 },
    { stress2_workload2 },
    { stress2_workload3 },
    { stress2_workload4 },
    { stress2_workload5 },
    { stress2_workload6 },
    { stress2_workload7 },
    { stress2_workload8 },
    { stress2_workload9 },
    { stress2_workload10 },
    { stress2_workload11 },
    { stress2_workload14 },
    { stress2_workload17 },
  };
  const char *zDb = "test.db";

  int i;
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  /* To make sure the db file is empty before commencing */
  opendb(&err, &db, zDb, 1);
  sql_script(&err, &db, 
      "CREATE TABLE IF NOT EXISTS t0(x PRIMARY KEY, y, z);"
      "CREATE INDEX IF NOT EXISTS i0 ON t0(y);"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);
  sqlite3_enable_shared_cache(1);

  for(i=0; i<sizeof(aTask)/sizeof(aTask[0]); i++){
    stress2_launch_thread_loop(&err, &threads, zDb, aTask[i].x);
  }
  launch_thread(&err, &threads, stress2_workload19, (void*)zDb);
  launch_thread(&err, &threads, stress2_workload19, (void*)zDb);

  join_all_threads(&err, &threads);
  sqlite3_enable_shared_cache(0);
  print_and_free_err(&err);
}
