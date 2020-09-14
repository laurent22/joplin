# 2010 April 22
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the operation of the library in
# "PRAGMA journal_mode=WAL" mode.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/wal_common.tcl
source $testdir/malloc_common.tcl

do_not_use_codec

ifcapable !wal {finish_test ; return }


# Test organization:
# 
#   walback-1.*: Simple tests.
#
#   walback-2.*: Test backups when the source db is modified mid-backup.
#
#   walback-3.*: Backup of WAL sources into rollback destinations, and 
#                vice-versa.
#

# Make sure a simple backup from a WAL database works.
#
do_test walbak-1.0 {
  execsql { 
    PRAGMA synchronous = NORMAL;
    PRAGMA page_size = 1024;
    PRAGMA auto_vacuum = 0;
    PRAGMA journal_mode = wal;
    BEGIN;
      CREATE TABLE t1(a PRIMARY KEY, b);
      INSERT INTO t1 VALUES('I', 'one');
    COMMIT;
  }
} {wal}
do_test walbak-1.1 {
  forcedelete bak.db bak.db-journal bak.db-wal
  db backup bak.db
  file size bak.db
} [expr 3*1024]
do_test walbak-1.2 {
  sqlite3 db2 bak.db
  execsql { 
    SELECT * FROM t1;
    PRAGMA main.journal_mode;
  } db2
} {I one wal}
do_test walbak-1.3 {
  execsql { PRAGMA integrity_check } db2
} {ok}
db2 close

# Try a VACUUM on a WAL database.
#
do_test walbak-1.4 {
  execsql { 
    VACUUM;
    PRAGMA main.journal_mode;
  }
} {wal}
do_test walbak-1.5 {
  list [file size test.db] [file size test.db-wal]
} [list 1024 [wal_file_size 6 1024]]
do_test walbak-1.6 {
  execsql { PRAGMA wal_checkpoint }
  list [file size test.db] [file size test.db-wal]
} [list [expr 3*1024] [wal_file_size 6 1024]]
do_test walbak-1.6.1 {
  hexio_read test.db 18 2
} {0202}
do_test walbak-1.7 {
  execsql { 
    CREATE TABLE t2(a, b);
    INSERT INTO t2 SELECT * FROM t1;
    DROP TABLE t1;
  }
  list [file size test.db] [file size test.db-wal]
} [list [expr 3*1024] [wal_file_size 6 1024]]
do_test walbak-1.8 {
  execsql { VACUUM }
  list [file size test.db] [file size test.db-wal]
} [list [expr 3*1024] [wal_file_size 8 1024]]
do_test walbak-1.9 {
  execsql { PRAGMA wal_checkpoint }
  list [file size test.db] [file size test.db-wal]
} [list [expr 2*1024] [wal_file_size 8 1024]]

#-------------------------------------------------------------------------
# Backups when the source db is modified mid-backup.
#
proc sig {{db db}} {
  $db eval { 
    PRAGMA integrity_check;
    SELECT md5sum(a, b) FROM t1; 
  }
}
db close
delete_file test.db
sqlite3 db test.db
do_test walbak-2.1 {
  execsql { PRAGMA journal_mode = WAL }
  execsql {
    CREATE TABLE t1(a PRIMARY KEY, b);
    BEGIN;
      INSERT INTO t1 VALUES(randomblob(500), randomblob(500));
      INSERT INTO t1 SELECT randomblob(500), randomblob(500) FROM t1; /*  2 */
      INSERT INTO t1 SELECT randomblob(500), randomblob(500) FROM t1; /*  4 */
      INSERT INTO t1 SELECT randomblob(500), randomblob(500) FROM t1; /*  8 */
      INSERT INTO t1 SELECT randomblob(500), randomblob(500) FROM t1; /* 16 */
      INSERT INTO t1 SELECT randomblob(500), randomblob(500) FROM t1; /* 32 */
      INSERT INTO t1 SELECT randomblob(500), randomblob(500) FROM t1; /* 64 */
    COMMIT;
  }
} {}
do_test walbak-2.2 {
  forcedelete abc.db
  db backup abc.db
  sqlite3 db2 abc.db
  string compare [sig db] [sig db2]
} {0}

do_test walbak-2.3 {
  sqlite3_backup B db2 main db main
  B step 50
  execsql { UPDATE t1 SET b = randomblob(500) }
  list [B step 1000] [B finish]
} {SQLITE_DONE SQLITE_OK}
do_test walbak-2.4 {
  string compare [sig db] [sig db2]
} {0}

do_test walbak-2.5 {
  db close
  sqlite3 db test.db
  execsql { PRAGMA cache_size = 10 }
  sqlite3_backup B db2 main db main
  B step 50
  execsql {
    BEGIN;
      UPDATE t1 SET b = randomblob(500);
  }
  expr [file size test.db-wal] > 10*1024
} {1}
do_test walbak-2.6 {
  B step 1000
} {SQLITE_BUSY}
do_test walbak-2.7 {
  execsql COMMIT
  list [B step 1000] [B finish]
} {SQLITE_DONE SQLITE_OK}
do_test walbak-2.8 {
  string compare [sig db] [sig db2]
} {0}

do_test walbak-2.9 {
  db close
  sqlite3 db test.db
  execsql { PRAGMA cache_size = 10 }
  sqlite3_backup B db2 main db main
  B step 50
  execsql {
    BEGIN;
      UPDATE t1 SET b = randomblob(500);
  }
  expr [file size test.db-wal] > 10*1024
} {1}
do_test walbak-2.10 {
  B step 1000
} {SQLITE_BUSY}
do_test walbak-2.11 {
  execsql ROLLBACK
set sigB [sig db]
  list [B step 1000] [B finish]
} {SQLITE_DONE SQLITE_OK}
do_test walbak-2.12 {
  string compare [sig db] [sig db2]
} {0}
db2 close
db close

#-------------------------------------------------------------------------
# Run some backup operations to copy back and forth between WAL and:
#
#   walbak-3.1.*: an in-memory database
#
#   walbak-3.2.*: a temporary database
#
#   walbak-3.3.*: a database in rollback mode.
#
#   walbak-3.4.*: a database in rollback mode that (initially) uses a 
#                 different page-size.
#
# Check that this does not confuse any connected clients.
#
foreach {tn setup} {
  1 {
    sqlite3 db  test.db
    sqlite3 db2 :memory:
    db  eval { PRAGMA page_size = 1024 ; PRAGMA journal_mode = WAL }
    db2 eval { PRAGMA page_size = 1024 }
  }

  2 {
    sqlite3 db  test.db
    sqlite3 db2 ""
    db  eval { PRAGMA page_size = 1024 ; PRAGMA journal_mode = WAL }
    db2 eval { PRAGMA page_size = 1024 }
  }

  3 {
    sqlite3 db  test.db
    sqlite3 db2 test.db2
    db  eval { PRAGMA page_size = 1024 ; PRAGMA journal_mode = WAL }
    db2 eval { PRAGMA page_size = 1024 ; PRAGMA journal_mode = PERSIST }
  }

  4 {
    sqlite3 db  test.db
    sqlite3 db2 test.db2
    db  eval { PRAGMA page_size = 1024 ; PRAGMA journal_mode = WAL }
    db2 eval { 
      PRAGMA page_size = 2048;
      PRAGMA journal_mode = PERSIST;
      CREATE TABLE xx(x);
    }
  }

} {
  if {$tn==4 && [sqlite3 -has-codec]} continue
  foreach f [glob -nocomplain test.db*] { forcedelete $f }

  eval $setup

  do_test walbak-3.$tn.1 {
    execsql {
      CREATE TABLE t1(a, b);
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t1 VALUES(3, 4);
      SELECT * FROM t1;
    }
  } {1 2 3 4}

  do_test walbak-3.$tn.2 {
    sqlite3_backup B db2 main db main
    B step 10000
    B finish
    execsql { SELECT * FROM t1 } db2
  } {1 2 3 4}

  do_test walbak-3.$tn.3 {
    execsql {
      INSERT INTO t1 VALUES(5, 6);
      INSERT INTO t1 VALUES(7, 8);
      SELECT * FROM t1;
    } db2
  } {1 2 3 4 5 6 7 8}

  do_test walbak-3.$tn.4 {
    sqlite3_backup B db main db2 main
    B step 10000
    B finish
    execsql { SELECT * FROM t1 }
  } {1 2 3 4 5 6 7 8}

  # Check that [db] is still in WAL mode.
  do_test walbak-3.$tn.5 {
    execsql { PRAGMA journal_mode }
  } {wal}
  do_test walbak-3.$tn.6 {
    execsql { PRAGMA wal_checkpoint }
    hexio_read test.db 18 2
  } {0202}

  # If it was not an in-memory database, check that [db2] is still in
  # rollback mode.
  if {[file exists test.db2]} {
    do_test walbak-3.$tn.7 {
      execsql { PRAGMA journal_mode } db2
    } {wal}
    do_test walbak-3.$tn.8 {
      execsql { PRAGMA wal_checkpoint }
      hexio_read test.db 18 2
    } {0202}
  }

  db  close
  db2 close
}

#-------------------------------------------------------------------------
# Test that the following holds when a backup operation is run:
#
#   Source  |  Destination inital  |  Destination final
#   ---------------------------------------------------
#   Rollback   Rollback               Rollback
#   Rollback   WAL                    WAL
#   WAL        Rollback               WAL
#   WAL        WAL                    WAL
#
foreach {tn src dest dest_final} {
  1   delete    delete    delete
  2   delete    wal       wal
  3   wal       delete    wal
  4   wal       wal       wal
} {
  catch { db close } 
  catch { db2 close } 
  forcedelete test.db test.db2

  do_test walbak-4.$tn.1 {
    sqlite3 db test.db
    db eval "PRAGMA journal_mode = $src"
    db eval {
      CREATE TABLE t1(a, b);
      INSERT INTO t1 VALUES('I', 'II');
      INSERT INTO t1 VALUES('III', 'IV');
    }

    sqlite3 db2 test.db2
    db2 eval "PRAGMA journal_mode = $dest"
    db2 eval {
      CREATE TABLE t2(x, y);
      INSERT INTO t2 VALUES('1', '2');
      INSERT INTO t2 VALUES('3', '4');
    }
  } {}

  do_test walbak-4.$tn.2 { execsql { PRAGMA journal_mode } db  } $src
  do_test walbak-4.$tn.3 { execsql { PRAGMA journal_mode } db2 } $dest

  do_test walbak-4.$tn.4 { db backup test.db2 } {}
  do_test walbak-4.$tn.5 {
    execsql { SELECT * FROM t1 } db2
  } {I II III IV}
  do_test walbak-4.$tn.5 { execsql { PRAGMA journal_mode } db2 } $dest_final


  db2 close
  do_test walbak-4.$tn.6 { file exists test.db2-wal } 0
  sqlite3 db2 test.db2
  do_test walbak-4.$tn.7 { execsql { PRAGMA journal_mode } db2 } $dest_final
}


finish_test
