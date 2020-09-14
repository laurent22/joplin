# 2017 January 4
#
# The author disclaims copyright to this source code.  In place of
# a legal notice', here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix triggerF
ifcapable {!trigger} {
  finish_test
  return
}


foreach {tn sql log} {
  1 {} {}

  2 { 
    CREATE TRIGGER trd AFTER DELETE ON t1 BEGIN
      INSERT INTO log VALUES(old.a || old.b || (SELECT count(*) FROM t1));
    END;
  } {1one2 2two1 3three1}

  3 { 
    CREATE TRIGGER trd BEFORE DELETE ON t1 BEGIN
      INSERT INTO log VALUES(old.a || old.b || (SELECT count(*) FROM t1));
    END;
  } {1one3 2two2 3three2}

  4 { 
    CREATE TRIGGER tr1 AFTER DELETE ON t1 BEGIN
      INSERT INTO log VALUES(old.a || old.b || (SELECT count(*) FROM t1));
    END;
    CREATE TRIGGER tr2 BEFORE DELETE ON t1 BEGIN
      INSERT INTO log VALUES(old.a || old.b || (SELECT count(*) FROM t1));
    END;
  } {1one3 1one2 2two2 2two1 3three2 3three1}

} {
  reset_db
  do_execsql_test 1.$tn.0 {
    PRAGMA recursive_triggers = on;
    CREATE TABLE t1(a INT PRIMARY KEY, b) WITHOUT ROWID;
    CREATE TABLE log(t);
  }
  
  execsql $sql

  do_execsql_test 1.$tn.1 {
    INSERT INTO t1 VALUES(1, 'one');
    INSERT INTO t1 VALUES(2, 'two');
    INSERT INTO t1 VALUES(3, 'three');

    DELETE FROM t1 WHERE a=1;
    INSERT OR REPLACE INTO t1 VALUES(2, 'three');
    UPDATE OR REPLACE t1 SET a=3 WHERE a=2;
  }

  do_execsql_test 1.$tn.2 {
    SELECT * FROM log ORDER BY rowid;
  } $log
}

finish_test
