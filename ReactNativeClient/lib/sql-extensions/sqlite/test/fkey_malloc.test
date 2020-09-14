# 2009 September 22
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
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !foreignkey||!trigger {
  finish_test
  return
}
source $testdir/malloc_common.tcl

do_malloc_test fkey_malloc-1 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(a PRIMARY KEY, b UNIQUE);
  CREATE TABLE t2(x REFERENCES t1 ON UPDATE CASCADE ON DELETE CASCADE);
} -sqlbody {
  INSERT INTO t1 VALUES('aaa', 1);
  INSERT INTO t2 VALUES('aaa');
  UPDATE t1 SET a = 'bbb';
  DELETE FROM t1;
  PRAGMA foreign_key_check;
}

do_malloc_test fkey_malloc-2 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(a, b, UNIQUE(a, b));
} -sqlbody {
  CREATE TABLE t2(x, y, 
    FOREIGN KEY(x, y) REFERENCES t1(a, b) DEFERRABLE INITIALLY DEFERRED
  );
  BEGIN;
    INSERT INTO t2 VALUES('a', 'b');
    INSERT INTO t1 VALUES('a', 'b');
    UPDATE t1 SET a = 'c';
    DELETE FROM t2;
    INSERT INTO t2 VALUES('d', 'b');
    UPDATE t2 SET x = 'c';
  COMMIT;
}

do_malloc_test fkey_malloc-3 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(x INTEGER PRIMARY KEY);
  CREATE TABLE t2(y DEFAULT 14 REFERENCES t1(x) ON UPDATE SET DEFAULT);
  CREATE TABLE t3(y REFERENCES t1 ON UPDATE SET NULL);
  INSERT INTO t1 VALUES(13);
  INSERT INTO t2 VALUES(13);
  INSERT INTO t3 VALUES(13);
} -sqlbody {
  UPDATE t1 SET x = 14;
}

proc catch_fk_error {zSql} {
  set rc [catch {db eval $zSql} msg]
  if {$rc==0} {
    return $msg
  }
  if {[string match {*foreign key*} $msg]} {
    return ""
  }
  if {$msg eq "out of memory" 
   || $msg eq "FOREIGN KEY constraint failed"
   || $msg eq "constraint failed"
  } {
    error 1
  }
  error $msg
}

do_malloc_test fkey_malloc-4 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(x INTEGER PRIMARY KEY, y UNIQUE);
  CREATE TABLE t2(z REFERENCES t1(x), a REFERENCES t1(y));
  CREATE TABLE t3(x);
  CREATE TABLE t4(z REFERENCES t3);
  CREATE TABLE t5(x, y);
  CREATE TABLE t6(z REFERENCES t5(x));
  CREATE INDEX i51 ON t5(x);
  CREATE INDEX i52 ON t5(y, x);
  INSERT INTO t1 VALUES(1, 2);
} -tclbody {
  catch_fk_error {INSERT INTO t2 VALUES(1, 3)}
  catch_fk_error {INSERT INTO t4 VALUES(2)}
  catch_fk_error {INSERT INTO t6 VALUES(2)}
}

do_malloc_test fkey_malloc-5 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(x, y, PRIMARY KEY(x, y));
  CREATE TABLE t2(a, b, FOREIGN KEY(a, b) REFERENCES t1 ON UPDATE CASCADE);
  INSERT INTO t1 VALUES(1, 2);
  INSERT INTO t2 VALUES(1, 2);
} -sqlbody {
  UPDATE t1 SET x = 5;
}

do_malloc_test fkey_malloc-6 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE t1(
    x PRIMARY KEY, 
    y REFERENCES t1 ON DELETE RESTRICT ON UPDATE SET DEFAULT
  );
  INSERT INTO t1 VALUES('abc', 'abc');
  INSERT INTO t1 VALUES('def', 'def');
} -sqlbody {
  INSERT INTO t1 VALUES('ghi', 'ghi');
  DELETE FROM t1 WHERE rowid>1;
  UPDATE t1 SET x='jkl', y='jkl';
}

do_malloc_test fkey_malloc-7 -sqlprep {
  PRAGMA foreign_keys = 1;
  CREATE TABLE x(a, b, PRIMARY KEY(a, b));
  CREATE TABLE y(c, d,
    FOREIGN KEY(d, c) REFERENCES x DEFERRABLE INITIALLY DEFERRED
  );
  CREATE TABLE z(e, f, FOREIGN KEY(e, f) REFERENCES x);
} -sqlbody {
  DROP TABLE y;
  DROP TABLE x;
}

finish_test
