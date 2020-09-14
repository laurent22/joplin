# 2007 June 8
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
# focus of this file is testing that terms in the ON clause of
# a LEFT OUTER JOIN are not used with indices.  See ticket #3015.
#
# $Id: where6.test,v 1.2 2008/04/17 19:14:02 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Build some test data
#
do_test where6-1.1 {
  execsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY,b,c);
    INSERT INTO t1 VALUES(1,3,1);
    INSERT INTO t1 VALUES(2,4,2);
    CREATE TABLE t2(x INTEGER PRIMARY KEY);
    INSERT INTO t2 VALUES(3);

    SELECT * FROM t1 LEFT JOIN t2 ON b=x AND c=1;
  }
} {1 3 1 3 2 4 2 {}}
do_test where6-1.2 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b AND c=1;
  }
} {1 3 1 3 2 4 2 {}}
do_test where6-1.3 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b AND 1=c;
  }
} {1 3 1 3 2 4 2 {}}
do_test where6-1.4 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b=x AND 1=c;
  }
} {1 3 1 3 2 4 2 {}}

ifcapable explain {
  do_test where6-1.5 {
     explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON x=b AND 1=c}
  } [explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON b=x AND c=1}]
  do_test where6-1.6 {
     explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON x=b WHERE 1=c}
  } [explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON b=x WHERE c=1}]
}

do_test where6-1.11 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b=x WHERE c=1;
  }
} {1 3 1 3}
do_test where6-1.12 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b WHERE c=1;
  }
} {1 3 1 3}
do_test where6-1.13 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b=x WHERE 1=c;
  }
} {1 3 1 3}



do_test where6-2.1 {
  execsql {
    CREATE INDEX i1 ON t1(c);

    SELECT * FROM t1 LEFT JOIN t2 ON b=x AND c=1;
  }
} {1 3 1 3 2 4 2 {}}
do_test where6-2.2 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b AND c=1;
  }
} {1 3 1 3 2 4 2 {}}
do_test where6-2.3 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b AND 1=c;
  }
} {1 3 1 3 2 4 2 {}}
do_test where6-2.4 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b=x AND 1=c;
  }
} {1 3 1 3 2 4 2 {}}

ifcapable explain {
  do_test where6-2.5 {
     explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON x=b AND 1=c}
  } [explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON b=x AND c=1}]
  do_test where6-2.6 {
     explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON x=b WHERE 1=c}
  } [explain_no_trace {SELECT * FROM t1 LEFT JOIN t2 ON b=x WHERE c=1}]
}


do_test where6-2.11 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b=x WHERE c=1;
  }
} {1 3 1 3}
do_test where6-2.12 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b WHERE c=1;
  }
} {1 3 1 3}
do_test where6-2.13 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON x=b WHERE 1=c;
  }
} {1 3 1 3}
do_test where6-2.14 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b=x WHERE 1=c;
  }
} {1 3 1 3}

# Ticket [ebdbadade5b]:
# If the ON close on a LEFT JOIN is of the form x=y where both x and y
# are indexed columns on tables to left of the join, then do not use that 
# term with indices to either table.
#
do_test where6-3.1 {
  db eval {
    CREATE TABLE t4(x UNIQUE);
    INSERT INTO t4 VALUES('abc');
    INSERT INTO t4 VALUES('def');
    INSERT INTO t4 VALUES('ghi');
    CREATE TABLE t5(a, b, c, PRIMARY KEY(a,b));
    INSERT INTO t5 VALUES('abc','def',123);
    INSERT INTO t5 VALUES('def','ghi',456);

    SELECT t4a.x, t4b.x, t5.c, t6.v
      FROM t4 AS t4a
           INNER JOIN t4 AS t4b
           LEFT JOIN t5 ON t5.a=t4a.x AND t5.b=t4b.x
           LEFT JOIN (SELECT 1 AS v) AS t6 ON t4a.x=t4b.x
     ORDER BY 1, 2, 3;
  }
} {abc abc {} 1 abc def 123 {} abc ghi {} {} def abc {} {} def def {} 1 def ghi 456 {} ghi abc {} {} ghi def {} {} ghi ghi {} 1}

finish_test
