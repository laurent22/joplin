# 2001 September 15
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
# $Id: tkt3992.test,v 1.1 2009/07/27 10:05:06 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3992-1.1 {
  execsql {
    CREATE TABLE parameters1(
       mountcnt    INT NOT NULL CHECK (typeof(mountcnt) == 'integer'),
       version     REAL NOT NULL
    );
    INSERT INTO parameters1(mountcnt, version) VALUES(1, 1.0);

    CREATE TABLE parameters2(
       mountcnt    INT NOT NULL CHECK (typeof(mountcnt) == 'integer'),
       version     REAL CHECK (typeof(version) == 'real')
    );
    INSERT INTO parameters2(mountcnt, version) VALUES(1, 1.0);
  }
} {}

do_test tkt3992-1.2 {
  execsql {
    UPDATE parameters1 SET mountcnt = mountcnt + 1;
    SELECT * FROM parameters1;
  }
} {2 1.0}

do_test tkt3992-1.3 {
  execsql {
    UPDATE parameters2 SET mountcnt = mountcnt + 1;
    SELECT * FROM parameters2;
  }
} {2 1.0}

ifcapable altertable {
  do_test tkt3992-2.1 {
    execsql {
      CREATE TABLE t1(a, b);
      INSERT INTO t1 VALUES(1, 2);
      ALTER TABLE t1 ADD COLUMN c DEFAULT 3;
      SELECT * FROM t1;
    }
  } {1 2 3}
  do_test tkt3992-2.2 {
    execsql {
      UPDATE t1 SET a = 'one';
      SELECT * FROM t1;
    }
  } {one 2 3}
}

ifcapable trigger {
  db function tcl eval
  do_test tkt3992-2.3 {
    execsql {
      CREATE TABLE t2(a REAL, b REAL, c REAL);
      INSERT INTO t2 VALUES(1, 2, 3);
      CREATE TRIGGER tr2 BEFORE UPDATE ON t2 BEGIN
        SELECT tcl('set res', typeof(new.c));
      END;
  
      UPDATE t2 SET a = 'I';
    }
    set res
  } {real}
}


finish_test
