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
** This file contains multi-threaded tests that use shared-cache and 
** the VACUUM command.
**
** Tests:
**
**     vacuum1
**
*/


static char *vacuum1_thread_writer(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  opendb(&err, &db, "test.db", 0);
  i64 i = 0;

  while( !timetostop(&err) ){
    i++;

    /* Insert lots of rows. Then delete some. */
    execsql(&err, &db, 
        "WITH loop(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM loop WHERE i<100) "
        "INSERT INTO t1 SELECT randomblob(50), randomblob(2500) FROM loop"
    );

    /* Delete lots of rows */
    execsql(&err, &db, "DELETE FROM t1 WHERE rowid = :i", &i);
    clear_error(&err, SQLITE_LOCKED);

    /* Select the rows */
    execsql(&err, &db, "SELECT * FROM t1 ORDER BY x");
    clear_error(&err, SQLITE_LOCKED);
  }

  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}

static char *vacuum1_thread_vacuumer(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  opendb(&err, &db, "test.db", 0);

  do{
    sql_script(&err, &db, "VACUUM");
    clear_error(&err, SQLITE_LOCKED);
  }while( !timetostop(&err) );

  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}

static void vacuum1(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, 
     "CREATE TABLE t1(x PRIMARY KEY, y BLOB);"
     "CREATE INDEX i1 ON t1(y);"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);

  sqlite3_enable_shared_cache(1);
  launch_thread(&err, &threads, vacuum1_thread_writer, 0);
  launch_thread(&err, &threads, vacuum1_thread_writer, 0);
  launch_thread(&err, &threads, vacuum1_thread_writer, 0);
  launch_thread(&err, &threads, vacuum1_thread_vacuumer, 0);
  join_all_threads(&err, &threads);
  sqlite3_enable_shared_cache(0);

  print_and_free_err(&err);
}
