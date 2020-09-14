# 2005 January 13
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
# focus of this file is testing corner cases of the INSERT statement.
#
# $Id: insert3.test,v 1.9 2009/04/23 14:58:40 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# All the tests in this file require trigger support
#
ifcapable {trigger} {

# Create a table and a corresponding insert trigger.  Do a self-insert
# into the table.
#
do_test insert3-1.0 {
  execsql {
    CREATE TABLE t1(a,b);
    CREATE TABLE log(x UNIQUE, y);
    CREATE TRIGGER r1 AFTER INSERT ON t1 BEGIN
      UPDATE log SET y=y+1 WHERE x=new.a;
      INSERT OR IGNORE INTO log VALUES(new.a, 1);
    END;
    INSERT INTO t1 VALUES('hello','world');
    INSERT INTO t1 VALUES(5,10);
    SELECT * FROM log ORDER BY x;
  }
} {5 1 hello 1}
do_test insert3-1.1 {
  execsql {
    INSERT INTO t1 SELECT a, b+10 FROM t1;
    SELECT * FROM log ORDER BY x;
  }
} {5 2 hello 2}
do_test insert3-1.2 {
  execsql {
    CREATE TABLE log2(x PRIMARY KEY,y);
    CREATE TRIGGER r2 BEFORE INSERT ON t1 BEGIN
      UPDATE log2 SET y=y+1 WHERE x=new.b;
      INSERT OR IGNORE INTO log2 VALUES(new.b,1);
    END;
    INSERT INTO t1 VALUES(453,'hi');
    SELECT * FROM log ORDER BY x;
  }
} {5 2 453 1 hello 2}
do_test insert3-1.3 {
  execsql {
    SELECT * FROM log2 ORDER BY x;
  }
} {hi 1}
ifcapable compound {
  do_test insert3-1.4.1 {
    execsql {
      INSERT INTO t1 SELECT * FROM t1;
      SELECT 'a:', x, y FROM log UNION ALL 
          SELECT 'b:', x, y FROM log2 ORDER BY x;
    }
  } {a: 5 4 b: 10 2 b: 20 1 a: 453 2 a: hello 4 b: hi 2 b: world 1}
  do_test insert3-1.4.2 {
    execsql {
      SELECT 'a:', x, y FROM log UNION ALL 
          SELECT 'b:', x, y FROM log2 ORDER BY x, y;
    }
  } {a: 5 4 b: 10 2 b: 20 1 a: 453 2 a: hello 4 b: hi 2 b: world 1}
  do_test insert3-1.5 {
    execsql {
      INSERT INTO t1(a) VALUES('xyz');
      SELECT * FROM log ORDER BY x;
    }
  } {5 4 453 2 hello 4 xyz 1}
}

do_test insert3-2.1 {
  execsql {
    CREATE TABLE t2(
      a INTEGER PRIMARY KEY,
      b DEFAULT 'b',
      c DEFAULT 'c'
    );
    CREATE TABLE t2dup(a,b,c);
    CREATE TRIGGER t2r1 BEFORE INSERT ON t2 BEGIN
      INSERT INTO t2dup(a,b,c) VALUES(new.a,new.b,new.c);
    END;
    INSERT INTO t2(a) VALUES(123);
    INSERT INTO t2(b) VALUES(234);
    INSERT INTO t2(c) VALUES(345);
    SELECT * FROM t2dup;
  }
} {123 b c -1 234 c -1 b 345}
do_test insert3-2.2 {
  execsql {
    DELETE FROM t2dup;
    INSERT INTO t2(a) SELECT 1 FROM t1 LIMIT 1;
    INSERT INTO t2(b) SELECT 987 FROM t1 LIMIT 1;
    INSERT INTO t2(c) SELECT 876 FROM t1 LIMIT 1;
    SELECT * FROM t2dup;
  }
} {1 b c -1 987 c -1 b 876}

# Test for proper detection of malformed WHEN clauses on INSERT triggers.
#
do_test insert3-3.1 {
  execsql {
    CREATE TABLE t3(a,b,c);
    CREATE TRIGGER t3r1 BEFORE INSERT on t3 WHEN nosuchcol BEGIN
      SELECT 'illegal WHEN clause';
    END;
  }
} {}
do_test insert3-3.2 {
  catchsql {
    INSERT INTO t3 VALUES(1,2,3)
  }
} {1 {no such column: nosuchcol}}
do_test insert3-3.3 {
  execsql {
    CREATE TABLE t4(a,b,c);
    CREATE TRIGGER t4r1 AFTER INSERT on t4 WHEN nosuchcol BEGIN
      SELECT 'illegal WHEN clause';
    END;
  }
} {}
do_test insert3-3.4 {
  catchsql {
    INSERT INTO t4 VALUES(1,2,3)
  }
} {1 {no such column: nosuchcol}}

} ;# ifcapable {trigger}

# Tests for the INSERT INTO ... DEFAULT VALUES construct
#
do_test insert3-3.5 {
  execsql {
    CREATE TABLE t5(
      a INTEGER PRIMARY KEY,
      b DEFAULT 'xyz'
    );
    INSERT INTO t5 DEFAULT VALUES;
    SELECT * FROM t5;
  }
} {1 xyz}
do_test insert3-3.6 {
  execsql {
    INSERT INTO t5 DEFAULT VALUES;
    SELECT * FROM t5;
  }
} {1 xyz 2 xyz}

ifcapable bloblit {
  do_test insert3-3.7 {
    execsql {
      CREATE TABLE t6(x,y DEFAULT 4.3, z DEFAULT x'6869');
      INSERT INTO t6 DEFAULT VALUES;
      SELECT * FROM t6;
    }
  } {{} 4.3 hi}
}

foreach tab [db eval {SELECT name FROM sqlite_master WHERE type = 'table'}] {
  db eval "DROP TABLE $tab"
}
db close
sqlite3 db test.db

#-------------------------------------------------------------------------
# While developing tests for a different feature (savepoint) the following
# sequence was found to cause an assert() in btree.c to fail. These
# tests are included to ensure that that bug is fixed.
#
do_test insert3-4.1 {
  execsql { 
    CREATE TABLE t1(a, b, c);
    CREATE INDEX i1 ON t1(a, b);
    BEGIN;
    INSERT INTO t1 VALUES(randstr(10,400),randstr(10,400),randstr(10,400));
  }
  set r "randstr(10,400)"
  for {set ii 0} {$ii < 10} {incr ii} {
    execsql "INSERT INTO t1 SELECT $r, $r, $r FROM t1"
  }
  execsql { COMMIT }
} {}
do_test insert3-4.2 {
  execsql {
    PRAGMA cache_size = 10;
    BEGIN;
      UPDATE t1 SET a = randstr(10,10) WHERE (rowid%4)==0;
      DELETE FROM t1 WHERE rowid%2;
      INSERT INTO t1 SELECT randstr(10,400), randstr(10,400), c FROM t1;
    COMMIT;
  }
} {}

finish_test
