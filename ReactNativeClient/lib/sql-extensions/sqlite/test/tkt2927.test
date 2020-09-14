# 2008 Feb 6
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
# This file is to test that ticket #2927 is fixed.
#
# $Id: tkt2927.test,v 1.4 2008/08/04 03:51:24 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

# Create a database.
#
do_test tkt2927-1.1 {
  db eval {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1,11);
    INSERT INTO t1 VALUES(2,22);
    INSERT INTO t1 VALUES(3,33);
    INSERT INTO t1 VALUES(4,44);
    INSERT INTO t1 VALUES(5,55);
    SELECT * FROM t1;
  }
} {1 11 2 22 3 33 4 44 5 55}


do_test tkt2927-2.1 {
  db eval {
    SELECT a, b FROM t1
    UNION ALL
    SELECT a, b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.2 {
#set sqlite_addop_trace 1
  db eval {
    SELECT a, b FROM t1
    UNION ALL
    SELECT a, abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.3 {
  db eval {
    SELECT a, b FROM t1
    UNION ALL
    SELECT abs(a), b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.4 {
  db eval {
    SELECT a, b FROM t1
    UNION ALL
    SELECT abs(a), abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.5 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION ALL
    SELECT a, b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.6 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION ALL
    SELECT a, abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.7 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION ALL
    SELECT abs(a), b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.8 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION ALL
    SELECT abs(a), abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.9 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION ALL
    SELECT a, b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.10 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION ALL
    SELECT a, abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.11 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION ALL
    SELECT abs(a), b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.12 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION ALL
    SELECT abs(a), abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.13 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION ALL
    SELECT a, b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.14 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION ALL
    SELECT a, abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.15 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION ALL
    SELECT abs(a), b FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-2.16 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION ALL
    SELECT abs(a), abs(b) FROM t1
  }
} {1 11 2 22 3 33 4 44 5 55 1 11 2 22 3 33 4 44 5 55}


do_test tkt2927-3.1 {
  db eval {
    SELECT a, b FROM t1
    UNION 
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.2 {
  db eval {
    SELECT a, b FROM t1
    UNION 
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.3 {
  db eval {
    SELECT a, b FROM t1
    UNION 
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.4 {
  db eval {
    SELECT a, b FROM t1
    UNION 
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.5 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION 
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.6 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION 
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.7 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION 
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.8 {
  db eval {
    SELECT a, abs(b) FROM t1
    UNION 
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.9 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION 
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.10 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION 
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.11 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION 
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.12 {
  db eval {
    SELECT abs(a), b FROM t1
    UNION 
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.13 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION 
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.14 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION 
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.15 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION 
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-3.16 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    UNION 
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}


do_test tkt2927-4.1 {
  db eval {
    SELECT a+b, a-b, a, b FROM t1
    UNION ALL
    SELECT a+b, a-b, a, b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.2 {
  db eval {
    SELECT a+b, a-b, a, b FROM t1
    UNION ALL
    SELECT a+b, a-b, a, abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.3 {
  db eval {
    SELECT a+b, a-b, a, b FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.4 {
  db eval {
    SELECT a+b, a-b, a, b FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.5 {
  db eval {
    SELECT a+b, a-b, a, abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, a, b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.6 {
  db eval {
    SELECT a+b, a-b, a, abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, a, abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.7 {
  db eval {
    SELECT a+b, a-b, a, abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.8 {
  db eval {
    SELECT a+b, a-b, a, abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.9 {
  db eval {
    SELECT a+b, a-b, abs(a), b FROM t1
    UNION ALL
    SELECT a+b, a-b, a, b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.10 {
  db eval {
    SELECT a+b, a-b, abs(a), b FROM t1
    UNION ALL
    SELECT a+b, a-b, a, abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.11 {
  db eval {
    SELECT a+b, a-b, abs(a), b FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.12 {
  db eval {
    SELECT a+b, a-b, abs(a), b FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.13 {
  db eval {
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, a, b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.14 {
  db eval {
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, a, abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.15 {
  db eval {
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), b FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}
do_test tkt2927-4.16 {
  db eval {
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
    UNION ALL
    SELECT a+b, a-b, abs(a), abs(b) FROM t1
  }
} {12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55 12 -10 1 11 24 -20 2 22 36 -30 3 33 48 -40 4 44 60 -50 5 55}


do_test tkt2927-5.1 {
  db eval {
    SELECT a, b FROM t1
    EXCEPT
    SELECT a, b FROM t1
  }
} {}
do_test tkt2927-5.2 {
  db eval {
    SELECT a, b FROM t1
    EXCEPT
    SELECT a, abs(b) FROM t1
  }
} {}
do_test tkt2927-5.3 {
  db eval {
    SELECT a, b FROM t1
    EXCEPT
    SELECT abs(a), b FROM t1
  }
} {}
do_test tkt2927-5.4 {
  db eval {
    SELECT a, b FROM t1
    EXCEPT
    SELECT abs(a), abs(b) FROM t1
  }
} {}
do_test tkt2927-5.5 {
  db eval {
    SELECT a, abs(b) FROM t1
    EXCEPT
    SELECT a, b FROM t1
  }
} {}
do_test tkt2927-5.6 {
  db eval {
    SELECT a, abs(b) FROM t1
    EXCEPT
    SELECT a, abs(b) FROM t1
  }
} {}
do_test tkt2927-5.7 {
  db eval {
    SELECT a, abs(b) FROM t1
    EXCEPT
    SELECT abs(a), b FROM t1
  }
} {}
do_test tkt2927-5.8 {
  db eval {
    SELECT a, abs(b) FROM t1
    EXCEPT
    SELECT abs(a), abs(b) FROM t1
  }
} {}
do_test tkt2927-5.9 {
  db eval {
    SELECT abs(a), b FROM t1
    EXCEPT
    SELECT a, b FROM t1
  }
} {}
do_test tkt2927-5.10 {
  db eval {
    SELECT abs(a), b FROM t1
    EXCEPT
    SELECT a, abs(b) FROM t1
  }
} {}
do_test tkt2927-5.11 {
  db eval {
    SELECT abs(a), b FROM t1
    EXCEPT
    SELECT abs(a), b FROM t1
  }
} {}
do_test tkt2927-5.12 {
  db eval {
    SELECT abs(a), b FROM t1
    EXCEPT
    SELECT abs(a), abs(b) FROM t1
  }
} {}
do_test tkt2927-5.13 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    EXCEPT
    SELECT a, b FROM t1
  }
} {}
do_test tkt2927-5.14 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    EXCEPT
    SELECT a, abs(b) FROM t1
  }
} {}
do_test tkt2927-5.15 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    EXCEPT
    SELECT abs(a), b FROM t1
  }
} {}
do_test tkt2927-5.16 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    EXCEPT
    SELECT abs(a), abs(b) FROM t1
  }
} {}


do_test tkt2927-6.1 {
  db eval {
    SELECT a, b FROM t1
    INTERSECT
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.2 {
  db eval {
    SELECT a, b FROM t1
    INTERSECT
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.3 {
  db eval {
    SELECT a, b FROM t1
    INTERSECT
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.4 {
  db eval {
    SELECT a, b FROM t1
    INTERSECT
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.5 {
  db eval {
    SELECT a, abs(b) FROM t1
    INTERSECT
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.6 {
  db eval {
    SELECT a, abs(b) FROM t1
    INTERSECT
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.7 {
  db eval {
    SELECT a, abs(b) FROM t1
    INTERSECT
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.8 {
  db eval {
    SELECT a, abs(b) FROM t1
    INTERSECT
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.9 {
  db eval {
    SELECT abs(a), b FROM t1
    INTERSECT
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.10 {
  db eval {
    SELECT abs(a), b FROM t1
    INTERSECT
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.11 {
  db eval {
    SELECT abs(a), b FROM t1
    INTERSECT
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.12 {
  db eval {
    SELECT abs(a), b FROM t1
    INTERSECT
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.13 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    INTERSECT
    SELECT a, b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.14 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    INTERSECT
    SELECT a, abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.15 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    INTERSECT
    SELECT abs(a), b FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}
do_test tkt2927-6.16 {
  db eval {
    SELECT abs(a), abs(b) FROM t1
    INTERSECT
    SELECT abs(a), abs(b) FROM t1
    ORDER BY 1
  }
} {1 11 2 22 3 33 4 44 5 55}

# Ticket #3092 is the same bug.  But another test case never hurts.
#
do_test tkt2927-7.1 {
  db eval {
    CREATE TABLE host (
     hostname text not null primary key,
     consoleHost text,
     consolePort text
    );
    INSERT INTO "host" VALUES('aald04','aalp03','4');
    INSERT INTO "host" VALUES('aald17','aalp01','1');
    CREATE VIEW consolemap1a as
      select hostname, consolehost, '/dev/cuaD0.' || (consoleport-1) consoleport
        from host where consolehost='aalp01';
    CREATE VIEW consolemap1b as
      select hostname hostname, consolehost consolehost, '/dev/cuaD' ||
             substr('01',1+((consoleport-1)/16),1) ||
             substr('0123456789abcdef',1+((consoleport-1)%16),1) consoleport
        from host where consolehost='aalp03';
    CREATE VIEW consolemap1 as
      select * from consolemap1a
      union
      select * from consolemap1b;
    SELECT * from consolemap1b;
  }
} {aald04 aalp03 /dev/cuaD03}
do_test tkt2927-7.2 {
  db eval {
    SELECT * FROM consolemap1
  }
} {aald04 aalp03 /dev/cuaD03 aald17 aalp01 /dev/cuaD0.0}

finish_test
