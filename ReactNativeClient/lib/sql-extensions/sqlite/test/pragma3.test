# 2014-12-19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests for PRAGMA data_version command.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[sqlite3 -has-codec]} {
  finish_test
  return
}

do_execsql_test pragma3-100 {
  PRAGMA data_version;
} {1}
do_execsql_test pragma3-101 {
  PRAGMA temp.data_version;
} {1}

# Writing to the pragma is a no-op 
do_execsql_test pragma3-102 {
  PRAGMA main.data_version=1234;
  PRAGMA main.data_version;
} {1 1}

# EVIDENCE-OF: R-27726-60934 The "PRAGMA data_version" command provides
# an indication that the database file has been modified.
#
# EVIDENCE-OF: R-47505-58569 The "PRAGMA data_version" value is
# unchanged for commits made on the same database connection.
#
do_execsql_test pragma3-110 {
  PRAGMA data_version;
  BEGIN IMMEDIATE;
  PRAGMA data_version;
  CREATE TABLE t1(a);
  INSERT INTO t1 VALUES(100),(200),(300);
  PRAGMA data_version;
  COMMIT;
  SELECT * FROM t1;
  PRAGMA data_version;
} {1 1 1 100 200 300 1}

sqlite3 db2 test.db
do_test pragma3-120 {
  db2 eval {
    SELECT * FROM t1;
    PRAGMA data_version;
  }
} {100 200 300 1}

do_execsql_test pragma3-130 {
  PRAGMA data_version;
  BEGIN IMMEDIATE;
  PRAGMA data_version;
  INSERT INTO t1 VALUES(400),(500);
  PRAGMA data_version;
  COMMIT;
  SELECT * FROM t1;
  PRAGMA data_version;
  PRAGMA shrink_memory;
} {1 1 1 100 200 300 400 500 1}

# EVIDENCE-OF: R-63005-41812 The integer values returned by two
# invocations of "PRAGMA data_version" from the same connection will be
# different if changes were committed to the database by any other
# connection in the interim.
#
# Value went from 1 in pragma3-120 to 2 here.
#
do_test pragma3-140 {
  db2 eval {
    SELECT * FROM t1;
    PRAGMA data_version;
    BEGIN IMMEDIATE;
    PRAGMA data_version;
    UPDATE t1 SET a=a+1;
    COMMIT;
    SELECT * FROM t1;
    PRAGMA data_version;
  }
} {100 200 300 400 500 2 2 101 201 301 401 501 2}
do_execsql_test pragma3-150 {
  SELECT * FROM t1;
  PRAGMA data_version;
} {101 201 301 401 501 2}

#
do_test pragma3-160 {
  db eval {
    BEGIN;
    PRAGMA data_version;
    UPDATE t1 SET a=555 WHERE a=501;
    PRAGMA data_version;
    SELECT * FROM t1 ORDER BY a;
    PRAGMA data_version;
  }
} {2 2 101 201 301 401 555 2}
do_test pragma3-170 {
  db2 eval {
    PRAGMA data_version;
  }
} {2}
do_test pragma3-180 {
  db eval {
    COMMIT;
    PRAGMA data_version;
  }
} {2}
do_test pragma3-190 {
  db2 eval {
    PRAGMA data_version;
  }
} {3}

# EVIDENCE-OF: R-19326-44825 The "PRAGMA data_version" value is a local
# property of each database connection and so values returned by two
# concurrent invocations of "PRAGMA data_version" on separate database
# connections are often different even though the underlying database is
# identical.
#
do_test pragma3-195 {
  expr {[db eval {PRAGMA data_version}]!=[db2 eval {PRAGMA data_version}]}
} {1}

# EVIDENCE-OF: R-54562-06892 The behavior of "PRAGMA data_version" is
# the same for all database connections, including database connections
# in separate processes and shared cache database connections.
#
# The next block checks the behavior for separate processes.
#
do_test pragma3-200 {
  db eval {PRAGMA data_version; SELECT * FROM t1;}
} {2 101 201 301 401 555}
do_test pragma3-201 {
  set fd [open pragma3.txt wb]
  puts $fd {
     sqlite3 db test.db;
     db eval {DELETE FROM t1 WHERE a>300};
     db close;
     exit;
  }
  close $fd
  exec [info nameofexec] pragma3.txt
  forcedelete pragma3.txt
  db eval {
    PRAGMA data_version;
    SELECT * FROM t1;
  }
} {3 101 201}
db2 close
db close

# EVIDENCE-OF: R-54562-06892 The behavior of "PRAGMA data_version" is
# the same for all database connections, including database connections
# in separate processes and shared cache database connections.
#
# The next block checks that behavior is the same for shared-cache.
#
ifcapable shared_cache {
  set ::enable_shared_cache [sqlite3_enable_shared_cache 1]
  sqlite3 db test.db
  sqlite3 db2 test.db
  do_test pragma3-300 {
    db eval {
      PRAGMA data_version;
      BEGIN;
      CREATE TABLE t3(a,b,c);
      CREATE TABLE t4(x,y,z);
      INSERT INTO t4 VALUES(123,456,789);
      PRAGMA data_version;
      COMMIT;
      PRAGMA data_version;
    }
  } {1 1 1}
  do_test pragma3-310 {
    db2 eval {
      PRAGMA data_version;
      BEGIN;
      INSERT INTO t3(a,b,c) VALUES('abc','def','ghi');
      SELECT * FROM t3;
      PRAGMA data_version;
    }
  } {2 abc def ghi 2}
  # The transaction in db2 has not yet committed, so the data_version in
  # db is unchanged.
  do_test pragma3-320 {
    db eval {
      PRAGMA data_version;
      SELECT * FROM t4;
    }
  } {1 123 456 789}
  do_test pragma3-330 {
    db2 eval {
      COMMIT;
      PRAGMA data_version;
      SELECT * FROM t4;
    }
  } {2 123 456 789}
  do_test pragma3-340 {
    db eval {
      PRAGMA data_version;
      SELECT * FROM t3;
      SELECT * FROM t4;
    }
  } {2 abc def ghi 123 456 789}
  db2 close
  db close
  sqlite3_enable_shared_cache $::enable_shared_cache
}

# Make sure this also works in WAL mode
#
# This will not work with the in-memory journal permutation, as opening
# [db2] switches the journal mode back to "memory"
#
if {[wal_is_capable]} {
if {[permutation]!="inmemory_journal"} {

  sqlite3 db test.db
  db eval {PRAGMA journal_mode=WAL}
  sqlite3 db2 test.db
  do_test pragma3-400 {
    db eval {
      PRAGMA data_version;
      PRAGMA journal_mode;
      SELECT * FROM t1;
    }
  } {2 wal 101 201}
  do_test pragma3-410 {
    db2 eval {
      PRAGMA data_version;
      PRAGMA journal_mode;
      SELECT * FROM t1;
    }
  } {2 wal 101 201}
  do_test pragma3-420 {
    db eval {UPDATE t1 SET a=111*(a/100); PRAGMA data_version; SELECT * FROM t1}
  } {2 111 222}
  do_test pragma3-430 {
    db2 eval {PRAGMA data_version; SELECT * FROM t1;}
  } {3 111 222}
  db2 close
}
}

#-------------------------------------------------------------------------
# Check that empty write transactions do not cause the return of "PRAGMA
# data_version" to be decremented with journal_mode=PERSIST and
# locking_mode=EXCLUSIVE
#
foreach {tn sql} {
  A {
  }
  B {
    PRAGMA journal_mode = PERSIST;
    PRAGMA locking_mode = EXCLUSIVE;
  }
} {
  reset_db
  execsql $sql

  do_execsql_test pragma3-510$tn {
    CREATE TABLE t1(x, y);
    INSERT INTO t1 VALUES(1, 2);
    PRAGMA data_version;
  } {1}

  do_execsql_test pragma3-520$tn {
    BEGIN EXCLUSIVE;
    COMMIT;
    PRAGMA data_version;
  } {1}
}

finish_test
