# 2011 January 27
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !fts3 { finish_test ; return }
set ::testprefix fts3aux2

do_execsql_test 1.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(a, b, languageid=l);
  INSERT INTO t1(a, b, l) VALUES
    ('zero zero', 'zero zero', 0),
    ('one two', 'three four', 1),
    ('five six', 'seven eight', 2)
  ;
  CREATE VIRTUAL TABLE terms USING fts4aux(t1);
} {}

do_execsql_test 1.2.1 {
  SELECT term, documents, occurrences, languageid FROM terms WHERE col = '*';
} {zero 1 4 0}

do_execsql_test 1.2.2 {
  SELECT * FROM terms;
} {zero * 1 4 zero 0 1 2 zero 1 1 2}

do_execsql_test 1.2.3 {
  SELECT * FROM terms WHERE languageid='';
} {}

do_execsql_test 1.2.4 {
  SELECT * FROM terms WHERE languageid=-1;
} {}

do_execsql_test 1.2.5 {
  SELECT * FROM terms WHERE languageid=9223372036854775807;
} {}

do_execsql_test 1.2.6 {
  SELECT * FROM terms WHERE languageid=-9223372036854775808;
} {}

do_execsql_test 1.2.7 {
  SELECT * FROM terms WHERE languageid=NULL;
} {}

do_execsql_test 1.3.1 {
  SELECT term, documents, occurrences, languageid 
  FROM terms WHERE col = '*' AND languageid=1;
} {
  four 1 1 1 one 1 1 1 three 1 1 1 two 1 1 1 
}

do_execsql_test 1.3.2 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE languageid=1;
} {
  four * 1 1 1   four 1 1 1 1 
  one * 1 1 1    one 0 1 1 1 
  three * 1 1 1  three 1 1 1 1 
  two * 1 1 1    two 0 1 1 1 
}

do_execsql_test 1.3.3 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE languageid=1 AND term='zero'
} {
}

do_execsql_test 1.3.4 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE languageid='1' AND term='two'
} {
  two * 1 1 1    two 0 1 1 1 
}

do_execsql_test 1.3.5 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE languageid='+1' AND term>'four'
} {
  one * 1 1 1    one 0 1 1 1 
  three * 1 1 1  three 1 1 1 1 
  two * 1 1 1    two 0 1 1 1 
}

do_execsql_test 1.4.1 {
  SELECT term, documents, occurrences, languageid 
  FROM terms WHERE col = '*' AND languageid=2;
} {
  eight 1 1 2 five 1 1 2 seven 1 1 2 six 1 1 2
}

do_execsql_test 1.4.2 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE languageid=2;
} {
  eight * 1 1 2    eight 1 1 1 2 
  five * 1 1 2     five 0 1 1 2 
  seven * 1 1 2    seven 1 1 1 2 
  six * 1 1 2      six 0 1 1 2
}

do_execsql_test 1.4.3 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE languageid=2 AND term='five';
} {
  five * 1 1 2     five 0 1 1 2 
}

do_execsql_test 1.4.4 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE term='five' AND languageid=2 
} {
  five * 1 1 2     five 0 1 1 2 
}

do_execsql_test 1.4.5 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE term>='seven' AND languageid=2
} {
  seven * 1 1 2    seven 1 1 1 2 
  six * 1 1 2      six 0 1 1 2
}

do_execsql_test 1.4.6 {
  SELECT term, col, documents, occurrences, languageid 
  FROM terms WHERE term>='e' AND term<'seven' AND languageid=2
} {
  eight * 1 1 2    eight 1 1 1 2 
  five * 1 1 2     five 0 1 1 2 
}

#-------------------------------------------------------------------------
do_execsql_test 2.0 {
  CREATE VIRTUAL TABLE ft USING fts3();
  INSERT INTO ft VALUES('a_234567890123456789');
  INSERT INTO ft VALUES('b_234567890123456789');
  INSERT INTO ft VALUES('c_234567890123456789');
  CREATE VIRTUAL TABLE t2 USING fts4aux(ft);
}

do_execsql_test 2.1 {
  SELECT term FROM t2 WHERE term=X'625f323334353637383930313233343536373839';
}

do_execsql_test 2.2 {
  SELECT term FROM t2 WHERE term<X'625f003334353637383930313233343536373839';
} {
  234567890123456789 234567890123456789 a a b b
}

do_execsql_test 2.3 {
  SELECT term FROM t2 WHERE term=X'625f003334353637383930313233343536373839';
}


finish_test
