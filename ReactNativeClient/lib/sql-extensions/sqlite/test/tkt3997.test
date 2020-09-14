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
# Tests to make sure #3997 is fixed.
#
# $Id: tkt3997.test,v 1.1 2009/07/28 13:30:31 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc reverse {lhs rhs} {
  return [string compare $rhs $lhs]
}
proc usual {lhs rhs} {
  return [string compare $lhs $rhs]
}

db collate reverse reverse
db collate usual usual

do_test tkt3997-1.1 {
  execsql {
    create table mytext(name BLOB);
    INSERT INTO mytext VALUES('abc');
    INSERT INTO mytext VALUES('acd');
    INSERT INTO mytext VALUES('afe');
  }
} {}
do_test tkt3997-1.2 {
  execsql { 
    SELECT name 
    FROM mytext 
    ORDER BY name COLLATE reverse 
  }
} {afe acd abc}
do_test tkt3997-1.3 {
  execsql { 
    SELECT name 
    FROM (SELECT name FROM mytext)  
    ORDER BY name COLLATE reverse 
  }
} {afe acd abc}

do_test tkt3997-2.1 {
  execsql { 
    CREATE TABLE mytext2(name COLLATE reverse);
    INSERT INTO mytext2 SELECT name FROM mytext;
  }
} {}
do_test tkt3997-2.2 {
  execsql { 
    SELECT name 
    FROM (SELECT name FROM mytext2)  
    ORDER BY name
  }
} {afe acd abc}
do_test tkt3997-2.3 {
  execsql { 
    SELECT name 
    FROM (SELECT name FROM mytext2)
    ORDER BY name COLLATE usual
  }
} {abc acd afe}

finish_test
