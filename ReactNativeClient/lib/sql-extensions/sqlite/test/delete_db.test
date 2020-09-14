# 2016 September 10
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
# focus of this file is testing the code in test_delete.c (the
# sqlite3_delete_database() API).
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix delete_db

if {[atomic_batch_write test.db]} {
  finish_test
  return
}

proc delete_all {} {
  foreach f [glob -nocomplain test2*] { file delete $f }
  foreach f [glob -nocomplain test3*] { file delete $f }
}

proc copydb {} {
  foreach f [glob -nocomplain test3*] { file delete $f }
  foreach f [glob -nocomplain test2*] { 
    set p [string range $f 5 end]
    file copy "test2$p" "test3$p"
  }
}

proc files {} {
  lsort [glob -nocomplain test3*]
}

db close
delete_all
sqlite3 db test2.database

#-------------------------------------------------------------------------
#
# 1.1: Journal files.
# 1.2: Wal files.
# 1.3: Multiplexor with journal file.
# 1.4: Multiplexor with wal file.
#
# 2.* are a copy of 1.* with the multiplexor enabled.
#
# 3.* tests errors.
#

do_test 1.1.0 {
  execsql {
    CREATE TABLE t1(x, y);
    BEGIN;
      INSERT INTO t1 VALUES(1, 2);
  }
  copydb
  files
} {test3.database test3.database-journal}

do_test 1.1.1 {
  sqlite3_delete_database test3.database
  files
} {}

do_test 1.2.0 {
  execsql {
    COMMIT;
    PRAGMA journal_mode = wal;
    INSERT INTO t1 VALUES(3, 4);
  }
  copydb
  files
} {test3.database test3.database-shm test3.database-wal}
do_test 1.2.1 {
  sqlite3_delete_database test3.database
  files
} {}

db close
delete_all
sqlite3_multiplex_initialize "" 0
sqlite3 db test2.database -vfs multiplex
sqlite3_multiplex_control db "main" chunk_size 32768

do_test 1.3.0 {
  execsql { PRAGMA auto_vacuum = 0; }
  execsql {
    CREATE TABLE x1(a, b);
    WITH s(i) AS ( VALUES(1) UNION ALL SELECT i+1 FROM s WHERE i<1000 )
    INSERT INTO x1 SELECT randomblob(100), randomblob(100) FROM s;
    BEGIN;
      UPDATE x1 SET a=randomblob(101)
  }
  copydb
  files
} [list {*}{
  test3.database test3.database-journal test3.database001 
  test3.database002 test3.database003
}]
do_test 1.3.1 {
  sqlite3_delete_database test3.database
  files
} {}


do_test 1.4.0 {
  execsql {
    COMMIT;
    PRAGMA journal_mode = wal;
    UPDATE x1 SET a=randomblob(102)
  }
  copydb
  files
} [list {*}{
  test3.database test3.database-shm test3.database-wal test3.database001 
  test3.database002 test3.database003
}]
do_test 1.4.1 {
  sqlite3_delete_database test3.database
  files
} {}


ifcapable 8_3_names {
  db close
  delete_all
  sqlite3 db file:test2.db?8_3_names=1 -uri 1

  do_test 2.1.0 {
    execsql {
      CREATE TABLE t1(x, y);
      BEGIN;
        INSERT INTO t1 VALUES(1, 2);
    }
    copydb
    files
  } {test3.db test3.nal}
  
  do_test 2.1.1 {
    sqlite3_delete_database test3.db
    files
  } {}
  
  do_test 2.2.0 {
    execsql {
      COMMIT;
      PRAGMA journal_mode = wal;
      INSERT INTO t1 VALUES(3, 4);
    }
    copydb
    files
  } {test3.db test3.shm test3.wal}
  do_test 2.2.1 {
    sqlite3_delete_database test3.db
    files
  } {}


  db close
  delete_all
  sqlite3_multiplex_initialize "" 0
  sqlite3 db file:test2.db?8_3_names=1 -uri 1 -vfs multiplex
  sqlite3_multiplex_control db "main" chunk_size 32768
  
  do_test 2.3.0 {
    execsql { PRAGMA auto_vacuum = 0; }
    execsql {
      CREATE TABLE x1(a, b);
      WITH s(i) AS ( VALUES(1) UNION ALL SELECT i+1 FROM s WHERE i<1000 )
      INSERT INTO x1 SELECT randomblob(100), randomblob(100) FROM s;
      BEGIN;
        UPDATE x1 SET a=randomblob(101)
    }
    copydb
    files
  } [list {*}{
    test3.001 test3.002 test3.003 test3.db test3.nal 
  }]
  do_test 2.3.1 {
    sqlite3_delete_database test3.db
    files
  } {}
  
  
  do_test 2.4.0 {
    execsql {
      COMMIT;
      PRAGMA journal_mode = wal;
      UPDATE x1 SET a=randomblob(102)
    }
    copydb
    files
  } [list {*}{
    test3.001 test3.002 test3.003 test3.db test3.db-shm test3.wal 
  }]
  do_test 2.4.1 {
    sqlite3_delete_database test3.db
    files
  } {}
}

db close
delete_all
sqlite3_multiplex_shutdown 

do_test 3.0 {
  file mkdir dir2.db
  sqlite3_delete_database dir2.db
} {SQLITE_ERROR}
do_test 3.1 {
  sqlite3_delete_database dir2.db/test.db
} {SQLITE_OK}

finish_test
