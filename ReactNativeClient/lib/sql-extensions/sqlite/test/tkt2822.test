# 2007 Dec 4
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that the issues surrounding expressions in
# ORDER BY clauses on compound SELECT statements raised by ticket
# #2822 have been dealt with.
#
# $Id: tkt2822.test,v 1.6 2008/08/20 16:35:10 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

# The ORDER BY matching algorithm is three steps:
# 
#   (1)  If the ORDER BY term is an integer constant i, then
#        sort by the i-th column of the result set.
# 
#   (2)  If the ORDER BY term is an identifier (not x.y or x.y.z
#        but simply x) then look for a column alias with the same
#        name.  If found, then sort by that column.
# 
#   (3)  Evaluate the term as an expression and sort by the
#        value of the expression.
# 
# For a compound SELECT the rules are modified slightly.
# In the third rule, the expression must exactly match one
# of the result columns.  The sequences of three rules is
# attempted first on the left-most SELECT.  If that doesn't
# work, we move to the right, one by one.
#
# Rule (3) is not in standard SQL - it is an SQLite extension,
# though one copied from PostgreSQL.  The rule for compound
# queries where a search is made of SELECTs to the right
# if the left-most SELECT does not match is not a part of
# standard SQL either.  This extension is unique to SQLite
# as far as we know.
#
# Rule (2) was added by the changes ticket #2822.  Prior to
# that changes, SQLite did not support rule (2), making it
# technically in violation of standard SQL semantics.  
# No body noticed because rule (3) has the same effect as
# rule (2) except in some obscure cases.
#


# Test plan:
#
#   tkt2822-1.* - Simple identifier as ORDER BY expression.
#   tkt2822-2.* - More complex ORDER BY expressions.

do_test tkt2822-0.1 {
  execsql {
    CREATE TABLE t1(a, b, c);
    CREATE TABLE t2(a, b, c);

    INSERT INTO t1 VALUES(1, 3, 9);
    INSERT INTO t1 VALUES(3, 9, 27);
    INSERT INTO t1 VALUES(5, 15, 45);

    INSERT INTO t2 VALUES(2, 6, 18);
    INSERT INTO t2 VALUES(4, 12, 36);
    INSERT INTO t2 VALUES(6, 18, 54);
  }
} {}

# Test the "ORDER BY <integer>" syntax.
#
do_test tkt2822-1.1 {
  execsql {
    SELECT a, b, c FROM t1 UNION ALL SELECT a, b, c FROM t2 ORDER BY 1;
  }
} {1 3 9 2 6 18 3 9 27 4 12 36 5 15 45 6 18 54}
do_test tkt2822-1.2 {
  execsql {
    SELECT a, CAST (b AS TEXT), c FROM t1 
      UNION ALL 
    SELECT a, b, c FROM t2 
      ORDER BY 2;
  }
} {2 6 18 4 12 36 6 18 54 5 15 45 1 3 9 3 9 27}

# Test the "ORDER BY <identifier>" syntax.
#
do_test tkt2822-2.1 {
  execsql {
    SELECT a, b, c FROM t1 UNION ALL SELECT a, b, c FROM t2 ORDER BY a;
  }
} {1 3 9 2 6 18 3 9 27 4 12 36 5 15 45 6 18 54}

do_test tkt2822-2.2 {
  execsql {
    SELECT a, CAST (b AS TEXT) AS x, c FROM t1 
      UNION ALL 
    SELECT a, b, c FROM t2 
      ORDER BY x;
  }
} {2 6 18 4 12 36 6 18 54 5 15 45 1 3 9 3 9 27}
do_test tkt2822-2.3 {
  execsql {
    SELECT t1.a, b, c FROM t1 UNION ALL SELECT t2.a, b, c FROM t2 ORDER BY a;
  }
} {1 3 9 2 6 18 3 9 27 4 12 36 5 15 45 6 18 54}

# Test the "ORDER BY <expression>" syntax.
#
do_test tkt2822-3.1 {
  execsql {
    SELECT a, CAST (b AS TEXT) AS x, c FROM t1 
      UNION ALL 
    SELECT a, b, c FROM t2 
      ORDER BY CAST (b AS TEXT);
  }
} {2 6 18 4 12 36 6 18 54 5 15 45 1 3 9 3 9 27}
do_test tkt2822-3.2 {
  execsql {
    SELECT t1.a, b, c FROM t1 UNION ALL SELECT t2.a, b, c FROM t2 ORDER BY t1.a;
  }
} {1 3 9 2 6 18 3 9 27 4 12 36 5 15 45 6 18 54}

# Test that if a match cannot be found in the leftmost SELECT, an
# attempt is made to find a match in subsequent SELECT statements.
#
do_test tkt2822-3.3 {
  execsql {
    SELECT a, b, c FROM t1 UNION ALL SELECT a AS x, b, c FROM t2 ORDER BY x;
  }
} {1 3 9 2 6 18 3 9 27 4 12 36 5 15 45 6 18 54}
do_test tkt2822-3.4 {
  # But the leftmost SELECT takes precedence.
  execsql {
    SELECT a AS b, CAST (b AS TEXT) AS a, c FROM t1 
      UNION ALL 
    SELECT a, b, c FROM t2 
      ORDER BY a;
  }
} {2 6 18 4 12 36 6 18 54 5 15 45 1 3 9 3 9 27}
do_test tkt2822-3.5 {
  execsql {
    SELECT a, b, c FROM t2 
      UNION ALL 
    SELECT a AS b, CAST (b AS TEXT) AS a, c FROM t1 
      ORDER BY a;
  }
} {1 3 9 2 6 18 3 9 27 4 12 36 5 15 45 6 18 54}

# Test some error conditions (ORDER BY clauses that match no column).
#
do_test tkt2822-4.1 {
  catchsql {
    SELECT a, b, c FROM t1 UNION ALL SELECT a, b, c FROM t2 ORDER BY x
  }
} {1 {1st ORDER BY term does not match any column in the result set}}
do_test tkt2822-4.2 {
  catchsql {
    SELECT a, CAST (b AS TEXT) AS x, c FROM t1 
      UNION ALL 
    SELECT a, b, c FROM t2 
      ORDER BY CAST (b AS INTEGER);
  }
} {1 {1st ORDER BY term does not match any column in the result set}}

# Tests for rule (2).
#
# The "ORDER BY b" should match the column alias (rule 2), not the
# the t3.b value (rule 3).  
#
do_test tkt2822-5.1 {
  execsql {
    CREATE TABLE t3(a,b);
    INSERT INTO t3 VALUES(1,8);
    INSERT INTO t3 VALUES(9,2);

    SELECT a AS b FROM t3 ORDER BY b;
  }
} {1 9}
do_test tkt2822-5.2 {
  # Case does not matter.  b should match B
  execsql {
    SELECT a AS b FROM t3 ORDER BY B;
  }
} {1 9}
do_test tkt2822-5.3 {
  # Quoting should not matter
  execsql {
    SELECT a AS 'b' FROM t3 ORDER BY "B";
  }
} {1 9}
do_test tkt2822-5.4 {
  # Quoting should not matter
  execsql {
    SELECT a AS "b" FROM t3 ORDER BY [B];
  }
} {1 9}

# In "ORDER BY +b" the term is now an expression rather than
# a label.  It therefore matches by rule (3) instead of rule (2).
# 
do_test tkt2822-5.5 {
  execsql {
    SELECT a AS b FROM t3 ORDER BY +b;
  }
} {9 1}

# Tests for rule 2 in compound queries
#
do_test tkt2822-6.1 {
  execsql {
    CREATE TABLE t6a(p,q);
    INSERT INTO t6a VALUES(1,8);
    INSERT INTO t6a VALUES(9,2);
    CREATE TABLE t6b(x,y);
    INSERT INTO t6b VALUES(1,7);
    INSERT INTO t6b VALUES(7,2);

    SELECT p, q FROM t6a UNION ALL SELECT x, y FROM t6b ORDER BY 1, 2
  }
} {1 7 1 8 7 2 9 2}
do_test tkt2822-6.2 {
  execsql {
    SELECT p PX, q QX FROM t6a UNION ALL SELECT x XX, y YX FROM t6b
    ORDER BY PX, YX
  }
} {1 7 1 8 7 2 9 2}
do_test tkt2822-6.3 {
  execsql {
    SELECT p PX, q QX FROM t6a UNION ALL SELECT x XX, y YX FROM t6b
    ORDER BY XX, QX
  }
} {1 7 1 8 7 2 9 2}
do_test tkt2822-6.4 {
  execsql {
    SELECT p PX, q QX FROM t6a UNION ALL SELECT x XX, y YX FROM t6b
    ORDER BY QX, XX
  }
} {7 2 9 2 1 7 1 8}
do_test tkt2822-6.5 {
  execsql {
    SELECT p PX, q QX FROM t6a UNION ALL SELECT x XX, y YX FROM t6b
    ORDER BY t6b.x, QX
  }
} {1 7 1 8 7 2 9 2}
do_test tkt2822-6.6 {
  execsql {
    SELECT p PX, q QX FROM t6a UNION ALL SELECT x XX, y YX FROM t6b
    ORDER BY t6a.q, XX
  }
} {7 2 9 2 1 7 1 8}

# More error message tests.  This is really more of a test of the
# %r ordinal value formatting capablity added to sqlite3_snprintf()
# by ticket #2822.
#
do_test tkt2822-7.1 {
  execsql {
    CREATE TABLE t7(a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,
                    a15,a16,a17,a18,a19,a20,a21,a22,a23,a24,a25);
  }
  catchsql {
    SELECT * FROM t7 ORDER BY 0;
  }
} {1 {1st ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.2.1 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 0;
  }
} {1 {2nd ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.2.2 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 26;
  }
} {1 {2nd ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.2.3 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 65536;
  }
} {1 {2nd ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.3 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 0;
  }
} {1 {3rd ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.4 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 0;
  }
} {1 {4th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.9 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 0;
  }
} {1 {9th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.10 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 0;
  }
} {1 {10th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.11 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0;
  }
} {1 {11th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.12 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 0;
  }
} {1 {12th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.13 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 0;
  }
} {1 {13th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.20 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                             11,12,13,14,15,16,17,18,19, 0
  }
} {1 {20th ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.21 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                             11,12,13,14,15,16,17,18,19, 20, 0
  }
} {1 {21st ORDER BY term out of range - should be between 1 and 25}}
do_test tkt2822-7.22 {
  catchsql {
    SELECT * FROM t7 ORDER BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                             11,12,13,14,15,16,17,18,19, 20, 21, 0
  }
} {1 {22nd ORDER BY term out of range - should be between 1 and 25}}


finish_test
