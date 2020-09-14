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
**     lookaside1
*/

/*
** The test in this file attempts to expose a specific race condition
** that is suspected to exist at time of writing.
*/

static char *lookaside1_thread_reader(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */

  opendb(&err, &db, "test.db", 0);

  while( !timetostop(&err) ){
    sqlite3_stmt *pStmt = 0;
    int rc;

    sqlite3_prepare_v2(db.db, "SELECT 1 FROM t1", -1, &pStmt, 0);
    while( sqlite3_step(pStmt)==SQLITE_ROW ){
      execsql(&err, &db, "SELECT length(x||y||z) FROM t2");
    }
    rc = sqlite3_finalize(pStmt);
    if( err.rc==SQLITE_OK && rc!=SQLITE_OK ){
      sqlite_error(&err, &db, "finalize");
    }
  }

  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}

static char *lookaside1_thread_writer(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */

  opendb(&err, &db, "test.db", 0);

  do{
    sql_script(&err, &db, 
      "BEGIN;"
        "UPDATE t3 SET i=i+1 WHERE x=1;"
      "ROLLBACK;"
    );
  }while( !timetostop(&err) );

  closedb(&err, &db);
  print_and_free_err(&err);
  return sqlite3_mprintf("ok");
}


static void lookaside1(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, 
     "CREATE TABLE t1(x PRIMARY KEY) WITHOUT ROWID;"
     "WITH data(x,y) AS ("
     "  SELECT 1, quote(randomblob(750)) UNION ALL "
     "  SELECT x*2, y||y FROM data WHERE x<5) "
     "INSERT INTO t1 SELECT y FROM data;"

     "CREATE TABLE t3(x PRIMARY KEY,i) WITHOUT ROWID;"
     "INSERT INTO t3 VALUES(1, 1);"

     "CREATE TABLE t2(x,y,z);"
     "INSERT INTO t2 VALUES(randomblob(50), randomblob(50), randomblob(50));"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);

  sqlite3_enable_shared_cache(1);
  launch_thread(&err, &threads, lookaside1_thread_reader, 0);
  launch_thread(&err, &threads, lookaside1_thread_reader, 0);
  launch_thread(&err, &threads, lookaside1_thread_reader, 0);
  launch_thread(&err, &threads, lookaside1_thread_reader, 0);
  launch_thread(&err, &threads, lookaside1_thread_reader, 0);
  launch_thread(&err, &threads, lookaside1_thread_writer, 0);
  join_all_threads(&err, &threads);
  sqlite3_enable_shared_cache(0);
  print_and_free_err(&err);
}
