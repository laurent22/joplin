# 2009 May 5
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
# Ticket #3838
#
# The ticket reports that the encoding is UTF8 on the DEFAULT VALUE of
# a column added using ALTER TABLE even when the database is UTF16.
# Verify that this has been fixed.
#
# $Id: tkt3838.test,v 1.1 2009/05/05 12:54:50 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !altertable {
  finish_test
  return
}

do_realnum_test tkt3838-1.1 {
  db eval {
    PRAGMA encoding=UTF16;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    ALTER TABLE t1 ADD COLUMN b INTEGER DEFAULT '999';
    ALTER TABLE t1 ADD COLUMN c REAL DEFAULT '9e99';
    ALTER TABLE t1 ADD COLUMN d TEXT DEFAULT 'xyzzy';
    UPDATE t1 SET x=x+1;
    SELECT * FROM t1;
  }
} {2 999 9e+99 xyzzy}

ifcapable trigger {
  do_test tkt3838-1.2 {
    db eval {
      CREATE TABLE log(y);
      CREATE TRIGGER r1 AFTER INSERT ON T1 BEGIN
        INSERT INTO log VALUES(new.x);
      END;
      INSERT INTO t1(x) VALUES(123);
      ALTER TABLE T1 RENAME TO XYZ2;
      INSERT INTO xyz2(x) VALUES(456);
      ALTER TABLE xyz2 RENAME TO pqr3;
      INSERT INTO pqr3(x) VALUES(789);
      SELECT * FROM log;
    }
  } {123 456 789}
}

finish_test
