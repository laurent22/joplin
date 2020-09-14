# 2001 September 27
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
# focus of this file is testing the CREATE UNIQUE INDEX statement,
# and primary keys, and the UNIQUE constraint on table columns
#
# $Id: unique.test,v 1.9 2009/05/02 15:46:47 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Try to create a table with two primary keys.
# (This is allowed in SQLite even that it is not valid SQL)
#
do_test unique-1.1 {
  catchsql {
    CREATE TABLE t1(
       a int PRIMARY KEY,
       b int PRIMARY KEY,
       c text
    );
  }
} {1 {table "t1" has more than one primary key}}
do_test unique-1.1b {
  catchsql {
    CREATE TABLE t1(
       a int PRIMARY KEY,
       b int UNIQUE,
       c text
    );
  }
} {0 {}}
do_test unique-1.2 {
  catchsql {
    INSERT INTO t1(a,b,c) VALUES(1,2,3)
  }
} {0 {}}
do_test unique-1.3 {
  catchsql {
    INSERT INTO t1(a,b,c) VALUES(1,3,4)
  }
} {1 {UNIQUE constraint failed: t1.a}}
verify_ex_errcode unique-1.3b SQLITE_CONSTRAINT_PRIMARYKEY
do_test unique-1.4 {
  execsql {
    SELECT * FROM t1 ORDER BY a;
  }
} {1 2 3}
do_test unique-1.5 {
  catchsql {
    INSERT INTO t1(a,b,c) VALUES(3,2,4)
  }
} {1 {UNIQUE constraint failed: t1.b}}
verify_ex_errcode unique-1.5b SQLITE_CONSTRAINT_UNIQUE
do_test unique-1.6 {
  execsql {
    SELECT * FROM t1 ORDER BY a;
  }
} {1 2 3}
do_test unique-1.7 {
  catchsql {
    INSERT INTO t1(a,b,c) VALUES(3,4,5)
  }
} {0 {}}
do_test unique-1.8 {
  execsql {
    SELECT * FROM t1 ORDER BY a;
  }
} {1 2 3 3 4 5}
integrity_check unique-1.9

do_test unique-2.0 {
  execsql {
    DROP TABLE t1;
    CREATE TABLE t2(a int, b int);
    INSERT INTO t2(a,b) VALUES(1,2);
    INSERT INTO t2(a,b) VALUES(3,4);
    SELECT * FROM t2 ORDER BY a;
  }
} {1 2 3 4}
do_test unique-2.1 {
  catchsql {
    CREATE UNIQUE INDEX i2 ON t2(a)
  }
} {0 {}}
do_test unique-2.2 {
  catchsql {
    SELECT * FROM t2 ORDER BY a
  }
} {0 {1 2 3 4}}
do_test unique-2.3 {
  catchsql {
    INSERT INTO t2 VALUES(1,5);
  }
} {1 {UNIQUE constraint failed: t2.a}}
verify_ex_errcode unique-2.3b SQLITE_CONSTRAINT_UNIQUE
do_test unique-2.4 {
  catchsql {
    SELECT * FROM t2 ORDER BY a
  }
} {0 {1 2 3 4}}
do_test unique-2.5 {
  catchsql {
    DROP INDEX i2;
    SELECT * FROM t2 ORDER BY a;
  }
} {0 {1 2 3 4}}
do_test unique-2.6 {
  catchsql {
    INSERT INTO t2 VALUES(1,5)
  }
} {0 {}}
do_test unique-2.7 {
  catchsql {
    SELECT * FROM t2 ORDER BY a, b;
  }
} {0 {1 2 1 5 3 4}}
do_test unique-2.8 {
  catchsql {
    CREATE UNIQUE INDEX i2 ON t2(a);
  }
} {1 {UNIQUE constraint failed: t2.a}}
verify_ex_errcode unique-2.8b SQLITE_CONSTRAINT_UNIQUE
do_test unique-2.9 {
  catchsql {
    CREATE INDEX i2 ON t2(a);
  }
} {0 {}}
integrity_check unique-2.10

# Test the UNIQUE keyword as used on two or more fields.
#
do_test unique-3.1 {
  catchsql {
    CREATE TABLE t3(
       a int,
       b int,
       c int,
       d int,
       unique(a,c,d)
     );
  }
} {0 {}}
do_test unique-3.2 {
  catchsql {
    INSERT INTO t3(a,b,c,d) VALUES(1,2,3,4);
    SELECT * FROM t3 ORDER BY a,b,c,d;
  }
} {0 {1 2 3 4}}
do_test unique-3.3 {
  catchsql {
    INSERT INTO t3(a,b,c,d) VALUES(1,2,3,5);
    SELECT * FROM t3 ORDER BY a,b,c,d;
  }
} {0 {1 2 3 4 1 2 3 5}}
do_test unique-3.4 {
  catchsql {
    INSERT INTO t3(a,b,c,d) VALUES(1,4,3,5);
    SELECT * FROM t3 ORDER BY a,b,c,d;
  }
} {1 {UNIQUE constraint failed: t3.a, t3.c, t3.d}}
verify_ex_errcode unique-3.4b SQLITE_CONSTRAINT_UNIQUE
integrity_check unique-3.5

# Make sure NULLs are distinct as far as the UNIQUE tests are
# concerned.
#
do_test unique-4.1 {
  execsql {
    CREATE TABLE t4(a UNIQUE, b, c, UNIQUE(b,c));
    INSERT INTO t4 VALUES(1,2,3);
    INSERT INTO t4 VALUES(NULL, 2, NULL);
    SELECT * FROM t4;
  }
} {1 2 3 {} 2 {}}
do_test unique-4.2 {
  catchsql {
    INSERT INTO t4 VALUES(NULL, 3, 4);
  }
} {0 {}}
do_test unique-4.3 {
  execsql {
    SELECT * FROM t4
  }
} {1 2 3 {} 2 {} {} 3 4}
do_test unique-4.4 {
  catchsql {
    INSERT INTO t4 VALUES(2, 2, NULL);
  }
} {0 {}}
do_test unique-4.5 {
  execsql {
    SELECT * FROM t4
  }
} {1 2 3 {} 2 {} {} 3 4 2 2 {}}

# Ticket #1301.  Any NULL value in a set of unique columns should
# cause the rows to be distinct.
#
do_test unique-4.6 {
  catchsql {
    INSERT INTO t4 VALUES(NULL, 2, NULL);
  }
} {0 {}}
do_test unique-4.7 {
  execsql {SELECT * FROM t4}
} {1 2 3 {} 2 {} {} 3 4 2 2 {} {} 2 {}}
do_test unique-4.8 {
  catchsql {CREATE UNIQUE INDEX i4a ON t4(a,b)}
} {0 {}}
do_test unique-4.9 {
  catchsql {CREATE UNIQUE INDEX i4b ON t4(a,b,c)}
} {0 {}}
do_test unique-4.10 {
  catchsql {CREATE UNIQUE INDEX i4c ON t4(b)}
} {1 {UNIQUE constraint failed: t4.b}}
verify_ex_errcode unique-4.10b SQLITE_CONSTRAINT_UNIQUE
integrity_check unique-4.99

# Test the error message generation logic.  In particular, make sure we
# do not overflow the static buffer used to generate the error message.
#
do_test unique-5.1 {
  execsql {
    CREATE TABLE t5(
      first_column_with_long_name,
      second_column_with_long_name,
      third_column_with_long_name,
      fourth_column_with_long_name,
      fifth_column_with_long_name,
      sixth_column_with_long_name,
      UNIQUE(
        first_column_with_long_name,
        second_column_with_long_name,
        third_column_with_long_name,
        fourth_column_with_long_name,
        fifth_column_with_long_name,
        sixth_column_with_long_name
      )
    );
    INSERT INTO t5 VALUES(1,2,3,4,5,6);
    SELECT * FROM t5;
  }
} {1 2 3 4 5 6}
do_test unique-5.2 {
  catchsql {
    INSERT INTO t5 VALUES(1,2,3,4,5,6);
  }
} {1 {UNIQUE constraint failed: t5.first_column_with_long_name, t5.second_column_with_long_name, t5.third_column_with_long_name, t5.fourth_column_with_long_name, t5.fifth_column_with_long_name, t5.sixth_column_with_long_name}}
verify_ex_errcode unique-5.2b SQLITE_CONSTRAINT_UNIQUE


finish_test
