# 2011 November 16
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file contains test cases for sqlite3_db_cacheflush API.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix cacheflush
test_set_config_pagecache 0 0

# Run the supplied SQL on a copy of the database currently stored on 
# disk in file $dbfile.
proc diskquery {dbfile sql} {
  forcecopy $dbfile dq.db
  sqlite3 dq dq.db
  set res [execsql $sql dq]
  dq close
  set res
}

# Simplest possible test.
#
do_execsql_test 1.1.0 {
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, 2);
  BEGIN;
    INSERT INTO t1 VALUES(3, 4);
}
do_test 1.1.1 {
  diskquery test.db { SELECT * FROM t1 } 
} {1 2}
do_test 1.1.2 {
  sqlite3_db_cacheflush db
  diskquery test.db { SELECT * FROM t1 } 
} {1 2 3 4}

# Test that multiple pages may be flushed to disk.
#
do_execsql_test 1.2.0 {
  COMMIT;
  CREATE TABLE t2(a, b);
  BEGIN;
    INSERT INTO t1 VALUES(5, 6);
    INSERT INTO t2 VALUES('a', 'b');
}
do_test 1.2.1 {
  diskquery test.db { 
    SELECT * FROM t1;
    SELECT * FROM t2;
  }
} {1 2 3 4}
do_test 1.2.2 {
  sqlite3_db_cacheflush db
  diskquery test.db { 
    SELECT * FROM t1;
    SELECT * FROM t2;
  }
} {1 2 3 4 5 6 a b}

# Test that pages with nRef!=0 are not flushed to disk.
#
do_execsql_test 1.3.0 {
  COMMIT;
  CREATE TABLE t3(a, b);
  BEGIN;
    INSERT INTO t1 VALUES(7, 8);
    INSERT INTO t2 VALUES('c', 'd');
    INSERT INTO t3 VALUES('i', 'ii');
}
do_test 1.3.1 {
  diskquery test.db { 
    SELECT * FROM t1;
    SELECT * FROM t2;
    SELECT * FROM t3;
  }
} {1 2 3 4 5 6 a b}
do_test 1.3.2 {
  db eval { SELECT a FROM t1 } {
    if {$a==3} {
      sqlite3_db_cacheflush db
    }
  }
  diskquery test.db { 
    SELECT * FROM t1;
    SELECT * FROM t2;
    SELECT * FROM t3;
  }
} {1 2 3 4 5 6 a b c d i ii}
do_test 1.3.2 {
  sqlite3_db_cacheflush db
  diskquery test.db { 
    SELECT * FROM t1;
    SELECT * FROM t2;
    SELECT * FROM t3;
  }
} {1 2 3 4 5 6 7 8 a b c d i ii}

# Check that SQLITE_BUSY is returned if pages cannot be flushed due to
# conflicting read locks.
#
do_execsql_test 1.4.0 {
  COMMIT;
  BEGIN;
    INSERT INTO t1 VALUES(9, 10);
}
do_test 1.4.1 {
  sqlite3 db2 test.db
  db2 eval {
    BEGIN;
      SELECT * FROM t1;
  }
  diskquery test.db { 
    SELECT * FROM t1;
  }
} {1 2 3 4 5 6 7 8}
do_test 1.4.2 {
  list [catch { sqlite3_db_cacheflush db } msg] $msg
} {1 {database is locked}}
do_test 1.4.3 {
  diskquery test.db { 
    SELECT * FROM t1;
  }
} {1 2 3 4 5 6 7 8}
do_test 1.4.4 {
  db2 close
  sqlite3_db_cacheflush db
  diskquery test.db { 
    SELECT * FROM t1;
  }
} {1 2 3 4 5 6 7 8 9 10}
do_execsql_test 1.4.5 { COMMIT }

#-------------------------------------------------------------------------
# Test that ATTACHed database caches are also flushed.
#
forcedelete test.db2
do_execsql_test 2.1.0 {
  ATTACH 'test.db2' AS aux;
  CREATE TABLE aux.t4(x, y);
  INSERT INTO t4 VALUES('A', 'B');
  BEGIN;
    INSERT INTO t1 VALUES(11, 12);
    INSERT INTO t4 VALUES('C', 'D');
}
do_test 2.1.1 {
  diskquery test.db { SELECT * FROM t1; }
} {1 2 3 4 5 6 7 8 9 10}
do_test 2.1.2 {
  diskquery test.db2 { SELECT * FROM t4; }
} {A B}
do_test 2.1.3 {
  sqlite3_db_cacheflush db
  diskquery test.db { SELECT * FROM t1; }
} {1 2 3 4 5 6 7 8 9 10 11 12}
do_test 2.1.4 {
  sqlite3_db_cacheflush db
  diskquery test.db2 { SELECT * FROM t4; }
} {A B C D}
do_execsql_test 2.1.5 { COMMIT }

# And that hitting an SQLITE_BUSY when flushing "main" does not stop
# SQLite from going on to flush "aux".
#
do_execsql_test 2.2.0 {
  BEGIN;
    INSERT INTO t1 VALUES(13, 14);
    INSERT INTO t4 VALUES('E', 'F');
}
do_test 2.2.1 {
  diskquery test.db { SELECT * FROM t1; }
} {1 2 3 4 5 6 7 8 9 10 11 12}
do_test 2.2.2 {
  diskquery test.db2 { SELECT * FROM t4; }
} {A B C D}
do_test 2.2.3 {
  sqlite3 db2 test.db
  execsql {
    BEGIN;
      SELECT * FROM t1;
  } db2
  list [catch { sqlite3_db_cacheflush db } msg] $msg
} {1 {database is locked}}
do_test 2.2.4 {
  diskquery test.db { SELECT * FROM t1; }
} {1 2 3 4 5 6 7 8 9 10 11 12}
do_test 2.2.5 {
  diskquery test.db2 { SELECT * FROM t4; }
} {A B C D E F}
do_test 2.2.6 {
  db2 close
  sqlite3_db_cacheflush db
  diskquery test.db { SELECT * FROM t1; }
} {1 2 3 4 5 6 7 8 9 10 11 12 13 14}
do_execsql_test 2.2.7 { COMMIT }

#-------------------------------------------------------------------------
# Test that nothing terrible happens if sqlite3_db_cacheflush() is
# called on an in-memory database.
#
do_test 3.0 {
  db close
  sqlite3 db :memory:
  db eval {
    CREATE TABLE t1(x PRIMARY KEY);
    CREATE TABLE t2(y PRIMARY KEY);
    BEGIN;
      INSERT INTO t1 VALUES(randomblob(100));
      INSERT INTO t2 VALUES(randomblob(100));
      INSERT INTO t1 VALUES(randomblob(100));
      INSERT INTO t2 VALUES(randomblob(100));
  }
  sqlite3_db_cacheflush db
} {}

do_execsql_test 3.1 { PRAGMA integrity_check } ok
do_execsql_test 3.2 { COMMIT }
do_execsql_test 3.3 { PRAGMA integrity_check } ok
do_execsql_test 3.4 { 
  SELECT count(*) FROM t1;
  SELECT count(*) FROM t2;
} {2 2}

#-------------------------------------------------------------------------
# Test that calling sqlite3_db_cacheflush() does not interfere with
# savepoint transactions.
#
do_test 4.0 {
  reset_db
  execsql {
    CREATE TABLE ta(a, aa);
    CREATE TABLE tb(b, bb);
    INSERT INTO ta VALUES('a', randomblob(500));
    INSERT INTO tb VALUES('b', randomblob(500));
    BEGIN;
      UPDATE ta SET a = 'A';
      SAVEPOINT one;
        UPDATE tb SET b = 'B';
  }

  sqlite3_db_cacheflush db
  diskquery test.db {
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {A B}

do_test 4.1 {
  execsql { 
    ROLLBACK TO one;
  }
  sqlite3_db_cacheflush db
  diskquery test.db {
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {A b}

do_test 4.2 {
  execsql { 
    INSERT INTO tb VALUES('c', randomblob(10));
    INSERT INTO tb VALUES('d', randomblob(10));
    INSERT INTO tb VALUES('e', randomblob(10));
  }
  sqlite3_db_cacheflush db
  diskquery test.db {
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {A b c d e}

do_test 4.3 {
  execsql { 
    SAVEPOINT two;
    UPDATE tb SET b = upper(b);
  }
  sqlite3_db_cacheflush db
  diskquery test.db {
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {A B C D E}

do_test 4.4 {
  execsql { 
    ROLLBACK TO two;
  }
  sqlite3_db_cacheflush db
  diskquery test.db {
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {A b c d e}

do_test 4.4 {
  execsql { 
    ROLLBACK TO one;
  }
  sqlite3_db_cacheflush db
  diskquery test.db {
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {A b}

do_test 4.5 {
  execsql { 
    ROLLBACK;
    SELECT a FROM ta;
    SELECT b FROM tb;
  }
} {a b}

test_restore_config_pagecache
finish_test
