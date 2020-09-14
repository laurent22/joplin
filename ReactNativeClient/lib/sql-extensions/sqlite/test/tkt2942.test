# 2008 February 15
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
# Ticket #2942.  
#
# Queries of the form:
#
#     SELECT group_concat(x) FROM (SELECT * FROM table ORDER BY 1);
#
# The ORDER BY would be dropped by the query flattener.  This used
# to not matter because aggregate functions sum(), min(), max(), avg(),
# and so forth give the same result regardless of the order of inputs.
# But with the addition of the group_concat() function, suddenly the
# order does matter.
#
# $Id: tkt2942.test,v 1.1 2008/02/15 14:33:04 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !subquery {
  finish_test
  return
}

do_test tkt2942.1 {
  execsql {
    create table t1(num int);
    insert into t1 values (2);
    insert into t1 values (1);
    insert into t1 values (3);
    insert into t1 values (4);
    SELECT group_concat(num) FROM (SELECT num FROM t1 ORDER BY num DESC);
  }
} {4,3,2,1}
do_test tkt2942.2 {
  execsql {
    SELECT group_concat(num) FROM (SELECT num FROM t1 ORDER BY num);
  }
} {1,2,3,4}
do_test tkt2942.3 {
  execsql {
    SELECT group_concat(num) FROM (SELECT num FROM t1);
  }
} {2,1,3,4}
do_test tkt2942.4 {
  execsql {
    SELECT group_concat(num) FROM (SELECT num FROM t1 ORDER BY rowid DESC);
  }
} {4,3,1,2}


finish_test
