# 2002 January 29
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
# This file implements tests for the NOT NULL constraint.
#
# $Id: notnull.test,v 1.4 2006/01/17 09:35:02 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !conflict {
  finish_test
  return
}

do_test notnull-1.0 {
  execsql {
    CREATE TABLE t1 (
      a NOT NULL,
      b NOT NULL DEFAULT 5,
      c NOT NULL ON CONFLICT REPLACE DEFAULT 6,
      d NOT NULL ON CONFLICT IGNORE DEFAULT 7,
      e NOT NULL ON CONFLICT ABORT DEFAULT 8
    );
    SELECT * FROM t1;
  }
} {}
do_test notnull-1.1 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-1.2 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-1.2b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.3 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {}}
do_test notnull-1.4 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-1.4b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.5 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-1.5b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.6 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-1.7 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-1.8 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-1.9 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-1.10 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,null,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.b}}
verify_ex_errcode notnull-1.10b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.11 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(a,b,c,d,e) VALUES(1,null,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {}}
do_test notnull-1.12 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(a,b,c,d,e) VALUES(1,null,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-1.13 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 6 4 5}}
do_test notnull-1.14 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {}}
do_test notnull-1.15 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 6 4 5}}
do_test notnull-1.16 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.c}}
verify_ex_errcode notnull-1.16b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.17 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,b,c,d,e) VALUES(1,2,3,null,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.d}}
verify_ex_errcode notnull-1.17b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.18 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,b,c,e) VALUES(1,2,3,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 3 7 5}}
do_test notnull-1.19 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d) VALUES(1,2,3,4);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 3 4 8}}
do_test notnull-1.20 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,2,3,4,null);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.e}}
verify_ex_errcode notnull-1.20b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-1.21 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(e,d,c,b,a) VALUES(1,2,3,null,5);
    SELECT * FROM t1 order by a;
  }
} {0 {5 5 3 2 1}}

do_test notnull-2.1 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-2.1b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-2.2 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR REPLACE t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-2.2b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-2.3 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR IGNORE t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-2.4 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR ABORT t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-2.4b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-2.5 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET b=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.b}}
verify_ex_errcode notnull-2.6b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-2.6 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR REPLACE t1 SET b=null, d=e, e=d;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 5 3 5 4}}
do_test notnull-2.7 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR IGNORE t1 SET b=null, d=e, e=d;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-2.8 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET c=null, d=e, e=d;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 6 5 4}}
do_test notnull-2.9 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET d=null, a=b, b=a;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-2.10 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET e=null, a=b, b=a;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.e}}
verify_ex_errcode notnull-2.10b SQLITE_CONSTRAINT_NOTNULL

do_test notnull-3.0 {
  execsql {
    CREATE INDEX t1a ON t1(a);
    CREATE INDEX t1b ON t1(b);
    CREATE INDEX t1c ON t1(c);
    CREATE INDEX t1d ON t1(d);
    CREATE INDEX t1e ON t1(e);
    CREATE INDEX t1abc ON t1(a,b,c);
  }
} {}
do_test notnull-3.1 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-3.2 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-3.2b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.3 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {}}
do_test notnull-3.4 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-3.4b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.5 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(b,c,d,e) VALUES(2,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-3.5b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.6 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-3.7 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-3.8 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-3.9 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,c,d,e) VALUES(1,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-3.10 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,null,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.b}}
verify_ex_errcode notnull-3.10b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.11 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(a,b,c,d,e) VALUES(1,null,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {}}
do_test notnull-3.12 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(a,b,c,d,e) VALUES(1,null,3,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 5 3 4 5}}
do_test notnull-3.13 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 6 4 5}}
do_test notnull-3.14 {
  catchsql {
    DELETE FROM t1;
    INSERT OR IGNORE INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {}}
do_test notnull-3.15 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 6 4 5}}
do_test notnull-3.16 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,b,c,d,e) VALUES(1,2,null,4,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.c}}
verify_ex_errcode notnull-3.16b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.17 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,b,c,d,e) VALUES(1,2,3,null,5);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.d}}
verify_ex_errcode notnull-3.17b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.18 {
  catchsql {
    DELETE FROM t1;
    INSERT OR ABORT INTO t1(a,b,c,e) VALUES(1,2,3,5);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 3 7 5}}
do_test notnull-3.19 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d) VALUES(1,2,3,4);
    SELECT * FROM t1 order by a;
  }
} {0 {1 2 3 4 8}}
do_test notnull-3.20 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1(a,b,c,d,e) VALUES(1,2,3,4,null);
    SELECT * FROM t1 order by a;
  }
} {1 {NOT NULL constraint failed: t1.e}}
verify_ex_errcode notnull-3.20b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-3.21 {
  catchsql {
    DELETE FROM t1;
    INSERT OR REPLACE INTO t1(e,d,c,b,a) VALUES(1,2,3,null,5);
    SELECT * FROM t1 order by a;
  }
} {0 {5 5 3 2 1}}

do_test notnull-4.1 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-4.1b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-4.2 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR REPLACE t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-4.2b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-4.3 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR IGNORE t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-4.4 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR ABORT t1 SET a=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.a}}
verify_ex_errcode notnull-4.4b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-4.5 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET b=null;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.b}}
verify_ex_errcode notnull-4.5b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-4.6 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR REPLACE t1 SET b=null, d=e, e=d;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 5 3 5 4}}
do_test notnull-4.7 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE OR IGNORE t1 SET b=null, d=e, e=d;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-4.8 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET c=null, d=e, e=d;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 6 5 4}}
do_test notnull-4.9 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET d=null, a=b, b=a;
    SELECT * FROM t1 ORDER BY a;
  }
} {0 {1 2 3 4 5}}
do_test notnull-4.10 {
  catchsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1,2,3,4,5);
    UPDATE t1 SET e=null, a=b, b=a;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 {NOT NULL constraint failed: t1.e}}
verify_ex_errcode notnull-4.10b SQLITE_CONSTRAINT_NOTNULL

# Test that bug 29ab7be99f is fixed.
#
do_test notnull-5.1 {
  execsql {
    DROP TABLE IF EXISTS t1;
    CREATE TABLE t1(a, b NOT NULL);
    CREATE TABLE t2(c, d);
    INSERT INTO t2 VALUES(3, 4);
    INSERT INTO t2 VALUES(5, NULL);
  }
}  {}
do_test notnull-5.2 {
  catchsql {
    INSERT INTO t1 VALUES(1, 2);
    INSERT INTO t1 SELECT * FROM t2;
  }
} {1 {NOT NULL constraint failed: t1.b}}
verify_ex_errcode notnull-5.2b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-5.3 {
  execsql { SELECT * FROM t1 }
} {1 2}
do_test notnull-5.4 {
  catchsql {
    DELETE FROM t1;
    BEGIN;
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t1 SELECT * FROM t2;
    COMMIT;
  }
} {1 {NOT NULL constraint failed: t1.b}}
verify_ex_errcode notnull-5.4b SQLITE_CONSTRAINT_NOTNULL
do_test notnull-5.5 {
  execsql { SELECT * FROM t1 }
} {1 2}

#-------------------------------------------------------------------------
# Check that UNIQUE NOT NULL indexes are always recognized as such.
#
proc uses_op_next {sql} {
  db eval "EXPLAIN $sql" a {
    if {$a(opcode)=="Next"} { return 1 }
  }
  return 0
}

proc do_uses_op_next_test {tn sql res} {
  uplevel [list do_test $tn [list uses_op_next $sql] $res]
}

reset_db
do_execsql_test notnull-6.0 {
  CREATE TABLE t1(a UNIQUE);
  CREATE TABLE t2(a NOT NULL UNIQUE);
  CREATE TABLE t3(a UNIQUE NOT NULL);
  CREATE TABLE t4(a NOT NULL);
  CREATE UNIQUE INDEX t4a ON t4(a);

  CREATE TABLE t5(a PRIMARY KEY);
  CREATE TABLE t6(a PRIMARY KEY NOT NULL);
  CREATE TABLE t7(a NOT NULL PRIMARY KEY);
  CREATE TABLE t8(a PRIMARY KEY) WITHOUT ROWID;

  CREATE TABLE t9(a PRIMARY KEY UNIQUE NOT NULL);
  CREATE TABLE t10(a UNIQUE PRIMARY KEY NOT NULL);
}

do_uses_op_next_test notnull-6.1 "SELECT * FROM t1 WHERE a IS ?" 1
do_uses_op_next_test notnull-6.2 "SELECT * FROM t2 WHERE a IS ?" 0
do_uses_op_next_test notnull-6.3 "SELECT * FROM t3 WHERE a IS ?" 0
do_uses_op_next_test notnull-6.4 "SELECT * FROM t4 WHERE a IS ?" 0

do_uses_op_next_test notnull-6.5 "SELECT * FROM t5 WHERE a IS ?" 1
do_uses_op_next_test notnull-6.6 "SELECT * FROM t6 WHERE a IS ?" 0
do_uses_op_next_test notnull-6.7 "SELECT * FROM t7 WHERE a IS ?" 0
do_uses_op_next_test notnull-6.8 "SELECT * FROM t8 WHERE a IS ?" 0

do_uses_op_next_test notnull-6.9 "SELECT * FROM t8 WHERE a IS ?" 0
do_uses_op_next_test notnull-6.10 "SELECT * FROM t8 WHERE a IS ?" 0

finish_test
