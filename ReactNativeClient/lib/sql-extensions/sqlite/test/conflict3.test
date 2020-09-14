# 2013-11-05
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
# This file implements tests for the conflict resolution extension
# to SQLite.
#
# This file focuses on making sure that combinations of REPLACE,
# IGNORE, and FAIL conflict resolution play well together.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix conflict3

ifcapable !conflict {
  finish_test
  return
}

do_execsql_test 1.1 {
  CREATE TABLE t1(
    a INTEGER PRIMARY KEY ON CONFLICT REPLACE, 
    b UNIQUE ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 1.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 1.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 1.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Replete the tests above, but this time on a table non-INTEGER primary key.
#
do_execsql_test 2.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a INT PRIMARY KEY ON CONFLICT REPLACE, 
    b UNIQUE ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 2.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 2.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 2.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Replete again on a WITHOUT ROWID table.
#
do_execsql_test 3.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a INT PRIMARY KEY ON CONFLICT REPLACE, 
    b UNIQUE ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL
  ) WITHOUT ROWID;
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 3.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 3.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 3.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Arrange the table rows in a different order and repeat.
#
do_execsql_test 4.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    b UNIQUE ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL,
    a INT PRIMARY KEY ON CONFLICT REPLACE
  ) WITHOUT ROWID;
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 4.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 4.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 4.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Arrange the table rows in a different order and repeat.
#
do_execsql_test 5.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    b UNIQUE ON CONFLICT IGNORE,
    a INT PRIMARY KEY ON CONFLICT REPLACE,
    c UNIQUE ON CONFLICT FAIL
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 5.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 5.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 5.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Arrange the table rows in a different order and repeat.
#
do_execsql_test 6.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    c UNIQUE ON CONFLICT FAIL,
    a INT PRIMARY KEY ON CONFLICT REPLACE,
    b UNIQUE ON CONFLICT IGNORE
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 6.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 6.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 6.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Change which column is the PRIMARY KEY
#
do_execsql_test 7.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a UNIQUE ON CONFLICT REPLACE, 
    b INTEGER PRIMARY KEY ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 7.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 7.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 7.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Change which column is the PRIMARY KEY
#
do_execsql_test 8.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a UNIQUE ON CONFLICT REPLACE, 
    b INT PRIMARY KEY ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 8.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 8.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 8.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Change which column is the PRIMARY KEY
#
do_execsql_test 9.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a UNIQUE ON CONFLICT REPLACE, 
    b INT PRIMARY KEY ON CONFLICT IGNORE,
    c UNIQUE ON CONFLICT FAIL
  ) WITHOUT ROWID;
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 9.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 9.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 9.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Change which column is the PRIMARY KEY
#
do_execsql_test 10.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a UNIQUE ON CONFLICT REPLACE, 
    b UNIQUE ON CONFLICT IGNORE,
    c INTEGER PRIMARY KEY ON CONFLICT FAIL
  );
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 10.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 10.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 10.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Change which column is the PRIMARY KEY
#
do_execsql_test 11.1 {
  DROP TABLE t1;
  CREATE TABLE t1(
    a UNIQUE ON CONFLICT REPLACE, 
    b UNIQUE ON CONFLICT IGNORE,
    c PRIMARY KEY ON CONFLICT FAIL
  ) WITHOUT ROWID;
  INSERT INTO t1(a,b,c) VALUES(1,2,3), (2,3,4);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert a row that conflicts on column B.  The insert should be ignored.
#
do_execsql_test 11.2 {
  INSERT INTO t1(a,b,c) VALUES(3,2,5);
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4}

# Insert two rows where the second conflicts on C.  The first row show go
# and and then there should be a constraint error.
#
do_test 11.3 {
  catchsql {INSERT INTO t1(a,b,c) VALUES(4,5,6), (5,6,4);}
} {1 {UNIQUE constraint failed: t1.c}}
do_execsql_test 11.4 {
  SELECT a,b,c FROM t1 ORDER BY a;
} {1 2 3 2 3 4 4 5 6}

# Check that ticket [f68dc596c4] has been fixed.
#
do_execsql_test 12.1 {
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b TEXT);
  INSERT INTO t2 VALUES(111, '111');
}
do_execsql_test 12.2 {
  REPLACE INTO t2 VALUES(NULL, '112'), (111, '111B');
}
do_execsql_test 12.3 {
  SELECT * FROM t2;
} {111 111B 112 112}

#-------------------------------------------------------------------------
ifcapable trigger {
  reset_db
  do_execsql_test 13.1.0 {
    PRAGMA recursive_triggers = true;
    CREATE TABLE t0 (c0 UNIQUE, c1 UNIQUE);
    CREATE TRIGGER tr0 AFTER DELETE ON t0 BEGIN 
      DELETE FROM t0; 
    END;

    INSERT INTO t0 VALUES(1, NULL);
    INSERT INTO t0 VALUES(0, NULL);
  }

  do_catchsql_test 13.1.1 {
    UPDATE OR REPLACE t0 SET c1 = 1;
  } {1 {constraint failed}}

  integrity_check 13.1.2

  do_execsql_test 13.1.3 {
    SELECT * FROM t0
  } {1 {} 0 {}}

  do_execsql_test 13.2.0 {
    CREATE TABLE t2 (a PRIMARY KEY, b UNIQUE, c UNIQUE) WITHOUT ROWID;
    CREATE TRIGGER tr3 AFTER DELETE ON t2 BEGIN 
      DELETE FROM t2; 
    END;

    INSERT INTO t2 VALUES(1, 1, 1);
    INSERT INTO t2 VALUES(2, 2, 2);
  }

  do_catchsql_test 13.2.1 {
    UPDATE OR REPLACE t2 SET c = 0;
  } {1 {constraint failed}}

  integrity_check 13.2.2

  do_execsql_test 13.2.3 {
    SELECT * FROM t2
  } {1 1 1 2 2 2}

  do_execsql_test 13.3.0 {
    CREATE TABLE t1(a, b);
    CREATE TABLE log(x);
    CREATE INDEX i1 ON t1(a);
    INSERT INTO t1 VALUES(1, 2);

    CREATE TRIGGER tb BEFORE UPDATE ON t1 BEGIN
      DELETE FROM t1;
    END;
    CREATE TRIGGER ta AFTER UPDATE ON t1 BEGIN
      INSERT INTO log VALUES('fired!');
    END;

    UPDATE t1 SET b=3;
  }

  do_execsql_test 13.3.1 {
    SELECT * FROM t1;
  } {}
  do_execsql_test 13.3.2 {
    SELECT * FROM log;
  } {}
}

finish_test
