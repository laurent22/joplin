# 2015 December 7
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. The focus
# of this file is the sqlite3_snapshot_xxx() APIs.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !snapshot {finish_test; return}
set testprefix snapshot

# This test does not work with the inmemory_journal permutation. The reason
# is that each connection opened as part of this permutation executes
# "PRAGMA journal_mode=memory", which fails if the database is in wal mode
# and there are one or more existing connections.
if {[permutation]=="inmemory_journal"} {
  finish_test
  return
}

foreach {tn tcl} {
  1 {
    proc snapshot_get {DB DBNAME} {
      uplevel [list sqlite3_snapshot_get $DB $DBNAME]
    }
    proc snapshot_open {DB DBNAME SNAPSHOT} {
      uplevel [list sqlite3_snapshot_open $DB $DBNAME $SNAPSHOT]
    }
    proc snapshot_free {SNAPSHOT} {
      uplevel [list sqlite3_snapshot_free $SNAPSHOT]
    }
    proc snapshot_cmp {SNAPSHOT1 SNAPSHOT2} {
      uplevel [list sqlite3_snapshot_cmp $SNAPSHOT1 $SNAPSHOT2]
    }
  }

  2 {
    proc snapshot_get {DB DBNAME} {
      uplevel [list sqlite3_snapshot_get_blob $DB $DBNAME]
    }
    proc snapshot_open {DB DBNAME SNAPSHOT} {
      uplevel [list sqlite3_snapshot_open_blob $DB $DBNAME $SNAPSHOT]
    }
    proc snapshot_free {SNAPSHOT} {
    }
    proc snapshot_cmp {SNAPSHOT1 SNAPSHOT2} {
      uplevel [list sqlite3_snapshot_cmp_blob $SNAPSHOT1 $SNAPSHOT2]
    }
  }
} {

  reset_db
  eval $tcl

  #-------------------------------------------------------------------------
  # Check some error conditions in snapshot_get(). It is an error if:
  #
  #  1) snapshot_get() is called on a non-WAL database, or
  #  2) there is an open write transaction on the database.
  #  3) the database handle is in auto-commit mode
  #
  do_execsql_test $tn.1.0 {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
    INSERT INTO t1 VALUES(3, 4);
  }

  do_test $tn.1.1.1 {
    execsql { BEGIN; SELECT * FROM t1; }
    list [catch { snapshot_get db main } msg] $msg
  } {1 SQLITE_ERROR}
  do_execsql_test $tn.1.1.2 COMMIT

  do_test $tn.1.2.1 {
    execsql {
      PRAGMA journal_mode = WAL;
      BEGIN;
        INSERT INTO t1 VALUES(5, 6);
        INSERT INTO t1 VALUES(7, 8);
    }
    list [catch { snapshot_get db main } msg] $msg
  } {1 SQLITE_ERROR}
  do_execsql_test $tn.1.2.2 COMMIT

  do_test $tn.1.3.1 {
    list [catch { snapshot_get db main } msg] $msg
  } {1 SQLITE_ERROR}
  do_test $tn.1.3.2 {
    db trans { set snap [snapshot_get db main] }
    snapshot_free $snap
  } {}

  #-------------------------------------------------------------------------
  # Check that a simple case works. Reuse the database created by the
  # block of tests above.
  #
  do_execsql_test $tn.2.1.0 {
    BEGIN;
      SELECT * FROM t1;
  } {1 2 3 4 5 6 7 8}

  do_test $tn.2.1.1 {
    set snapshot [snapshot_get db main]
    execsql {
      COMMIT;
      INSERT INTO t1 VALUES(9, 10);
      SELECT * FROM t1;
    }
  } {1 2 3 4 5 6 7 8 9 10}

  do_test $tn.2.1.2 {
    execsql BEGIN
    snapshot_open db main $snapshot
    execsql {
      SELECT * FROM t1;
    }
  } {1 2 3 4 5 6 7 8}

  do_test $tn.2.1.3 {
    snapshot_free $snapshot
    execsql COMMIT
  } {}

  do_test $tn.2.2.0 {
    sqlite3 db2 test.db
    execsql {
      BEGIN;
        SELECT * FROM t1;
    } db2
  } {1 2 3 4 5 6 7 8 9 10}

  do_test $tn.2.2.1 {
    set snapshot [snapshot_get db2 main]
    execsql {
      INSERT INTO t1 VALUES(11, 12);
      SELECT * FROM t1;
    }
  } {1 2 3 4 5 6 7 8 9 10 11 12}

  do_test $tn.2.2.2 {
    execsql BEGIN
    snapshot_open db main $snapshot
    execsql {
      SELECT * FROM t1;
    }
  } {1 2 3 4 5 6 7 8 9 10}

  do_test $tn.2.2.3 {
    snapshot_free $snapshot
    execsql COMMIT
    execsql COMMIT db2
    db2 close
  } {}

  do_test $tn.2.3.1 {
    execsql { DELETE FROM t1 WHERE a>6 }
    db trans { set snapshot [snapshot_get db main] }
    execsql {
      INSERT INTO t1 VALUES('a', 'b');
      INSERT INTO t1 VALUES('c', 'd');
      SELECT * FROM t1;
    }
  } {1 2 3 4 5 6 a b c d}
  do_test $tn.2.3.2 {
    execsql BEGIN
    snapshot_open db main $snapshot
    execsql { SELECT * FROM t1 }
  } {1 2 3 4 5 6}

  do_test $tn.2.3.3 {
    catchsql {
      INSERT INTO t1 VALUES('x','y')
    }
  } {1 {database is locked}}
  do_test $tn.2.3.4 {
    execsql COMMIT
    snapshot_free $snapshot
  } {}

  #-------------------------------------------------------------------------
  # Check some errors in snapshot_open(). It is an error if:
  #
  #   1) the db is in auto-commit mode,
  #   2) the db has an open (read or write) transaction,
  #   3) the db is not a wal database,
  #
  # Reuse the database created by earlier tests.
  #
  do_execsql_test $tn.3.0.0 {
    CREATE TABLE t2(x, y);
    INSERT INTO t2 VALUES('a', 'b');
    INSERT INTO t2 VALUES('c', 'd');
    BEGIN;
      SELECT * FROM t2;
  } {a b c d}
  do_test $tn.3.0.1 {
    set snapshot [snapshot_get db main]
    execsql { COMMIT }
    execsql { INSERT INTO t2 VALUES('e', 'f'); }
  } {}

  do_test $tn.3.1 {
    list [catch {snapshot_open db main $snapshot } msg] $msg
  } {1 SQLITE_ERROR}

  do_test $tn.3.2.1 {
    execsql {
      BEGIN;
        SELECT * FROM t2;
    }
  } {a b c d e f}

  # Update - it is no longer an error to have a read-transaction open, 
  # provided there are no active SELECT statements.
  do_test $tn.3.2.2a {
    db eval "SELECT * FROM t2" {
      set res [list [catch {snapshot_open db main $snapshot } msg] $msg]
      break
    }
    set res
  } {1 SQLITE_ERROR}
  do_test $tn.3.2.2b {
    snapshot_open db main $snapshot
  } {}

  do_test $tn.3.2.3 {
    execsql {
      COMMIT;
      BEGIN;
        INSERT INTO t2 VALUES('g', 'h');
    }
    list [catch {snapshot_open db main $snapshot } msg] $msg
  } {1 SQLITE_ERROR}
  do_execsql_test $tn.3.2.4 COMMIT

  do_test $tn.3.3.1a {
    execsql { PRAGMA journal_mode = DELETE }
    execsql { BEGIN }
    list [catch {snapshot_open db main $snapshot } msg] $msg
  } {1 SQLITE_ERROR}

  do_test $tn.3.3.1b {
    execsql { COMMIT ; BEGIN ; SELECT * FROM t2 }
    list [catch {snapshot_open db main $snapshot } msg] $msg
  } {1 SQLITE_ERROR}

  do_test $tn.$tn.3.3.2 {
    snapshot_free $snapshot
    execsql COMMIT
  } {}

  #-------------------------------------------------------------------------
  # Check that SQLITE_ERROR_SNAPSHOT is returned if the specified snapshot
  # no longer exists because the wal file has been checkpointed.
  #
  #   1. Reading a snapshot from the middle of a wal file is not possible
  #      after the wal file has been checkpointed.
  #
  #   2. That a snapshot from the end of a wal file can not be read once
  #      the wal file has been wrapped.
  #
  do_execsql_test $tn.4.1.0 {
    PRAGMA journal_mode = wal;
    CREATE TABLE t3(i, j);
    INSERT INTO t3 VALUES('o', 't');
    INSERT INTO t3 VALUES('t', 'f');
    BEGIN;
      SELECT * FROM t3;
  } {wal o t t f}

  do_test $tn.4.1.1 {
    set snapshot [snapshot_get db main]
    execsql COMMIT
  } {}
  do_test $tn.4.1.2 {
    execsql { 
      INSERT INTO t3 VALUES('f', 's'); 
      BEGIN;
    }
    snapshot_open db main $snapshot
    execsql { SELECT * FROM t3 }
  } {o t t f}

  do_test $tn.4.1.3 {
    execsql { 
      COMMIT;
      PRAGMA wal_checkpoint;
      BEGIN;
    }
    list [catch {snapshot_open db main $snapshot} msg] $msg
  } {1 SQLITE_ERROR_SNAPSHOT}
  do_test $tn.4.1.4 {
    snapshot_free $snapshot
    execsql COMMIT
  } {}

  do_test $tn.4.2.1 {
    execsql {
      INSERT INTO t3 VALUES('s', 'e');
      INSERT INTO t3 VALUES('n', 't');
      BEGIN;
        SELECT * FROM t3;
    }
  } {o t t f f s s e n t}
  do_test $tn.4.2.2 {
    set snapshot [snapshot_get db main]
    execsql {
      COMMIT;
      PRAGMA wal_checkpoint;
      BEGIN;
    }
    snapshot_open db main $snapshot
    execsql { SELECT * FROM t3 }
  } {o t t f f s s e n t}
  do_test $tn.4.2.3 {
    execsql {
      COMMIT;
      INSERT INTO t3 VALUES('e', 't');
      BEGIN;
    }
    list [catch {snapshot_open db main $snapshot} msg] $msg
  } {1 SQLITE_ERROR_SNAPSHOT}
  do_test $tn.4.2.4 {
    snapshot_free $snapshot
  } {}

  #-------------------------------------------------------------------------
  # Check that SQLITE_BUSY is returned if a checkpoint is running when
  # sqlite3_snapshot_open() is called.
  #
  reset_db
  db close
  testvfs tvfs
  sqlite3 db test.db -vfs tvfs

  do_execsql_test $tn.5.1 {
    PRAGMA journal_mode = wal;
    CREATE TABLE x1(x, xx, xxx);
    INSERT INTO x1 VALUES('z', 'zz', 'zzz');
    BEGIN;
      SELECT * FROM x1;
  } {wal z zz zzz}

  do_test $tn.5.2 {
    set ::snapshot [snapshot_get db main]
    sqlite3 db2 test.db -vfs tvfs
    execsql {
      INSERT INTO x1 VALUES('a', 'aa', 'aaa');
      COMMIT;
    }
  } {}

  set t53 0
  proc write_callback {args} {
    do_test $tn.5.3.[incr ::t53] {
      execsql BEGIN
      list [catch { snapshot_open db main $::snapshot } msg] $msg
    } {1 SQLITE_BUSY}
    catchsql COMMIT
  }

  tvfs filter xWrite
  tvfs script write_callback
  db2 eval { PRAGMA wal_checkpoint }
  db close
  db2 close
  tvfs delete
  snapshot_free $snapshot

  #-------------------------------------------------------------------------
  # Test that sqlite3_snapshot_get() may be called immediately after
  # "BEGIN; PRAGMA user_version;". And that sqlite3_snapshot_open() may
  # be called after opening the db handle and running the script
  # "PRAGMA user_version; BEGIN".
  reset_db
  do_execsql_test $tn.6.1 {
    PRAGMA journal_mode = wal;
    CREATE TABLE x1(x, xx, xxx);
    INSERT INTO x1 VALUES('z', 'zz', 'zzz');
    BEGIN;
      PRAGMA user_version;
  } {wal 0}
  do_test $tn.6.2 {
    set ::snapshot [snapshot_get db main]
    execsql {
      INSERT INTO x1 VALUES('a', 'aa', 'aaa');
      COMMIT;
    }
  } {}
  do_test $tn.6.3 {
    sqlite3 db2 test.db 
    db2 eval "PRAGMA user_version ; BEGIN"
    snapshot_open db2 main $::snapshot
    db2 eval { SELECT * FROM x1 }
  } {z zz zzz}
  do_test $tn.6.4 {
    db2 close
    sqlite3 db2 test.db 
    db2 eval "PRAGMA application_id"
    db2 eval "BEGIN"
    snapshot_open db2 main $::snapshot
    db2 eval { SELECT * FROM x1 }
  } {z zz zzz}

  do_test $tn.6.5 {
    db2 close
    sqlite3 db2 test.db 
    db2 eval "BEGIN"
    list [catch {snapshot_open db2 main $::snapshot} msg] $msg
  } {1 SQLITE_ERROR}

  snapshot_free $snapshot

  #-------------------------------------------------------------------------
  # The following tests investigate the sqlite3_snapshot_cmp() API.
  #

  # Compare snapshots $p1 and $p2, checking that the result is $r.
  #
  proc do_snapshot_cmp_test {tn p1 p2 r} {
    uplevel [list do_test $tn.1 [list snapshot_cmp $p1 $p2] $r]
    uplevel [list do_test $tn.2 [list snapshot_cmp $p2 $p1] [expr $r*-1]]
    uplevel [list do_test $tn.3 [list snapshot_cmp $p1 $p1] 0]
    uplevel [list do_test $tn.4 [list snapshot_cmp $p2 $p2] 0]
  }

  catch { db2 close }
  reset_db

  do_execsql_test $tn.7.1 {
    PRAGMA journal_mode = wal;
    CREATE TABLE t1(x);
  } wal

  do_test $tn.7.1.2 {
    execsql { BEGIN ; PRAGMA application_id }
    set p1 [snapshot_get db main]
    execsql {
      INSERT INTO t1 VALUES(10);
      COMMIT;
    }
    execsql { BEGIN ; PRAGMA application_id }
    set p2 [snapshot_get db main]
    execsql COMMIT
  } {}

  do_snapshot_cmp_test $tn.7.1.3 $p1 $p2 -1
  snapshot_free $p1
  snapshot_free $p2

  do_execsql_test $tn.7.2.1 {
    INSERT INTO t1 VALUES(11);
    INSERT INTO t1 VALUES(12);
    INSERT INTO t1 VALUES(13);
    BEGIN; 
      PRAGMA application_id;
  } {0}
  do_test $tn.7.2.2 {
    set p1 [snapshot_get db main]
    execsql {
      COMMIT;
      INSERT INTO t1 VALUES(14);
      PRAGMA wal_checkpoint;
      BEGIN;
        PRAGMA application_id;
    }
    set p2 [snapshot_get db main]
    execsql COMMIT
  } {}

  do_snapshot_cmp_test $tn.7.2.3 $p1 $p2 -1
  snapshot_free $p2

  do_test $tn.7.3.1 {
    execsql {
      INSERT INTO t1 VALUES(14);
      BEGIN;
        PRAGMA application_id;
    }
    set p2 [snapshot_get db main]
    execsql COMMIT
  } {}

  do_snapshot_cmp_test $tn.7.3.2 $p1 $p2 -1
  snapshot_free $p1
  snapshot_free $p2
}

finish_test
