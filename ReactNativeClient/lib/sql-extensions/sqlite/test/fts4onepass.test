# 2015 Sep 27
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set ::testprefix fts4onepass

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE ft USING fts3;
  INSERT INTO ft(rowid, content) VALUES(1, '1 2 3');
  INSERT INTO ft(rowid, content) VALUES(2, '4 5 6');
  INSERT INTO ft(rowid, content) VALUES(3, '7 8 9');
}

#-------------------------------------------------------------------------
# Check that UPDATE and DELETE statements that feature "WHERE rowid=?" or 
# or "WHERE docid=?" clauses do not use statement journals. But that other
# DELETE and UPDATE statements do.
#
# Note: "MATCH ? AND docid=?" does use a statement journal.
#
foreach {tn sql uses} {
  1.1 { DELETE FROM ft } 1
  1.2 { DELETE FROM ft WHERE docid=? } 0
  1.3 { DELETE FROM ft WHERE rowid=? } 0
  1.4 { DELETE FROM ft WHERE ft MATCH '1' } 1
  1.5 { DELETE FROM ft WHERE ft MATCH '1' AND docid=? } 1
  1.6 { DELETE FROM ft WHERE ft MATCH '1' AND rowid=? } 1

  2.1 { UPDATE ft SET content='a b c' } 1
  2.2 { UPDATE ft SET content='a b c' WHERE docid=? } 0
  2.3 { UPDATE ft SET content='a b c' WHERE rowid=? } 0
  2.4 { UPDATE ft SET content='a b c' WHERE ft MATCH '1' } 1
  2.5 { UPDATE ft SET content='a b c' WHERE ft MATCH '1' AND docid=? } 1
  2.6 { UPDATE ft SET content='a b c' WHERE ft MATCH '1' AND rowid=? } 1
} {
  do_test 1.$tn { sql_uses_stmt db $sql } $uses
}

#-------------------------------------------------------------------------
# Check that putting a "DELETE/UPDATE ... WHERE rowid=?" statement in a
# trigger program does not prevent the VM from using a statement 
# transaction. Even if the calling statement cannot hit a constraint.
#
do_execsql_test 2.0 {
  CREATE TABLE t1(x);

  CREATE TRIGGER t1_ai AFTER INSERT ON t1 BEGIN
    DELETE FROM ft WHERE rowid=new.x;
  END;

  CREATE TRIGGER t1_ad AFTER DELETE ON t1 BEGIN
    UPDATE ft SET content = 'a b c' WHERE rowid=old.x;
  END;

  CREATE TRIGGER t1_bu BEFORE UPDATE ON t1 BEGIN
    DELETE FROM ft WHERE rowid=old.x;
  END;
}

foreach {tn sql uses} {
  1 { INSERT INTO t1 VALUES(1)      } 1
  2 { DELETE FROM t1 WHERE x=4      } 1
  3 { UPDATE t1 SET x=10 WHERE x=11 } 1
} {
  do_test 2.$tn { sql_uses_stmt db $sql } $uses
}

#-------------------------------------------------------------------------
# Test that an "UPDATE ... WHERE rowid=?" works and does not corrupt the
# index when it strikes a constraint. Both inside and outside a 
# transaction.
#
foreach {tn tcl1 tcl2}  {
  1 {} {}

  2 {
    execsql BEGIN
  } {
    if {[sqlite3_get_autocommit db]==1} { error "transaction rolled back!" }
    execsql COMMIT
  }
} {

  do_execsql_test 3.$tn.0 {
    DROP TABLE IF EXISTS ft2;
    CREATE VIRTUAL TABLE ft2 USING fts4;
    INSERT INTO ft2(rowid, content) VALUES(1, 'a b c');
    INSERT INTO ft2(rowid, content) VALUES(2, 'a b d');
    INSERT INTO ft2(rowid, content) VALUES(3, 'a b e');
  }

  eval $tcl1
  foreach {tn2 sql content} {
    1 { UPDATE ft2 SET docid=2 WHERE docid=1 }
      { 1 {a b c} 2 {a b d} 3 {a b e} }

    2 { 
      INSERT INTO ft2(rowid, content) VALUES(4, 'a b f');
      UPDATE ft2 SET docid=5 WHERE docid=4;
      UPDATE ft2 SET docid=3 WHERE docid=5;
    } { 1 {a b c} 2 {a b d} 3 {a b e} 5 {a b f} }

    3 {
      UPDATE ft2 SET docid=3 WHERE docid=4;           -- matches 0 rows
      UPDATE ft2 SET docid=2 WHERE docid=3;
    } { 1 {a b c} 2 {a b d} 3 {a b e} 5 {a b f} }

    4 {
      INSERT INTO ft2(rowid, content) VALUES(4, 'a b g');
      UPDATE ft2 SET docid=-1 WHERE docid=4;
      UPDATE ft2 SET docid=3 WHERE docid=-1;
    } {-1 {a b g} 1 {a b c} 2 {a b d} 3 {a b e} 5 {a b f} }

    5 {
      DELETE FROM ft2 WHERE rowid=451;
      DELETE FROM ft2 WHERE rowid=-1;
      UPDATE ft2 SET docid = 2 WHERE docid = 1;
    } {1 {a b c} 2 {a b d} 3 {a b e} 5 {a b f} }
  } {
    do_catchsql_test 3.$tn.$tn2.a $sql {1 {constraint failed}}
    do_execsql_test  3.$tn.$tn2.b { SELECT rowid, content FROM ft2 } $content
    do_execsql_test  3.$tn.$tn2.c { 
      INSERT INTO ft2(ft2) VALUES('integrity-check');
    }
  }
  eval $tcl2
}

do_execsql_test 4.0 {
  CREATE VIRTUAL TABLE zt USING fts4(a, b);
  INSERT INTO zt(rowid, a, b) VALUES(1, 'unus duo', NULL);
  INSERT INTO zt(rowid, a, b) VALUES(2, NULL, NULL);

  BEGIN;
    UPDATE zt SET b='septum' WHERE rowid = 1;
    UPDATE zt SET b='octo' WHERE rowid = 1;
  COMMIT;

  SELECT count(*) FROM zt_segdir;
} {3}


finish_test
