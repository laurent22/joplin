# 2011 October 18
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

ifcapable !fts3 {
  finish_test
  return
}

set testprefix fts3first

proc lreverse {L} {
  set res [list]
  for {set ii [expr [llength $L]-1]} {$ii>=0} {incr ii -1} {
    lappend res [lindex $L $ii]
  }
  set res
}

proc mit {blob} {
  set scan(littleEndian) i*
  set scan(bigEndian) I*
  binary scan $blob $scan($::tcl_platform(byteOrder)) r
  return $r
}
db func mit mit

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE x1 USING FTS4(a, b, c);
  INSERT INTO x1(docid,a,b,c) VALUES(0, 'K H D S T', 'V M N Y K', 'S Z N Q S');
  INSERT INTO x1(docid,a,b,c) VALUES(1, 'K N J L W', 'S Z W J Q', 'D U W S E');
  INSERT INTO x1(docid,a,b,c) VALUES(2, 'B P M O I', 'R P H W S', 'R J L L E');
  INSERT INTO x1(docid,a,b,c) VALUES(3, 'U R Q M L', 'M J K A V', 'Q W J T J');
  INSERT INTO x1(docid,a,b,c) VALUES(4, 'N J C Y N', 'R U D X V', 'B O U A Q');
  INSERT INTO x1(docid,a,b,c) VALUES(5, 'Q L X L U', 'I F N X S', 'U Q A N Y');
  INSERT INTO x1(docid,a,b,c) VALUES(6, 'M R G U T', 'U V I Q P', 'X Y D L S');
  INSERT INTO x1(docid,a,b,c) VALUES(7, 'D Y P O I', 'X J P K R', 'V O T H V');
  INSERT INTO x1(docid,a,b,c) VALUES(8, 'R Y D L R', 'U U E S J', 'N W L M R');
  INSERT INTO x1(docid,a,b,c) VALUES(9, 'Z P F N P', 'W A X D U', 'V A E Q A');
  INSERT INTO x1(docid,a,b,c) VALUES(10, 'Q I A Q M', 'N D K H C', 'A H T Q Z');
  INSERT INTO x1(docid,a,b,c) VALUES(11, 'T E R Q B', 'C I B C B', 'F Z U W R');
  INSERT INTO x1(docid,a,b,c) VALUES(12, 'E S V U W', 'T P F W H', 'A M D J Q');
  INSERT INTO x1(docid,a,b,c) VALUES(13, 'X S B X Y', 'U D N D P', 'X Z Y G F');
  INSERT INTO x1(docid,a,b,c) VALUES(14, 'K H A B L', 'S R C C Z', 'D W E H J');
  INSERT INTO x1(docid,a,b,c) VALUES(15, 'C E U C C', 'W F M N M', 'T Z U X T');
  INSERT INTO x1(docid,a,b,c) VALUES(16, 'Q G C G H', 'H N N B H', 'B Q I H Y');
  INSERT INTO x1(docid,a,b,c) VALUES(17, 'Q T S K B', 'W B D Y N', 'V J P E C');
  INSERT INTO x1(docid,a,b,c) VALUES(18, 'A J M O Q', 'L G Y Y A', 'G N M R N');
  INSERT INTO x1(docid,a,b,c) VALUES(19, 'T R Y P Y', 'N V Y B X', 'L Z T N T');

  CREATE VIRTUAL TABLE x2 USING FTS4(a, b, c, order=DESC);
  INSERT INTO x2(docid, a, b, c) SELECT docid, a, b, c FROM x1;
}


# Test queries.
#
foreach x {1 2} {
  foreach {tn match res} {
    1  "^K"              {0 1 14}
    2  "^S"              {0 1 14}
    3  "^W"              {9 15 17}
    4  "^J"              {}
    5  "^E"              {12}
    6  "V ^-E"           {0 3 4 6 7 9 17 19}
    7  "V -^E"           {0 3 4 6 7 9 17 19}
    8  "^-E V"           {0 3 4 6 7 9 17 19}
    9  "-^E V"           {0 3 4 6 7 9 17 19}
    10 "V"               {0 3 4 6 7 9 12 17 19}

    11 {"^K H"}          {0 14}
    12 {"K H"}           {0 10 14}
    13 {"K ^H"}          {}
  } {
    set rev [lreverse $res]
    do_execsql_test 1.$x.$tn.1 {SELECT docid FROM x1 WHERE x1 MATCH $match} $res
    do_execsql_test 1.$x.$tn.2 {SELECT docid FROM x2 WHERE x2 MATCH $match} $rev
  }

  do_execsql_test 1.$x.[expr $tn+1] { 
    INSERT INTO x1(x1) VALUES('optimize');
    INSERT INTO x2(x2) VALUES('optimize');
  } {}
}

# Test the snippet() function.
#
foreach {tn match res} {
  1  {^K}    {{[K] H D S T} {[K] N J L W} {[K] H A B L}}
  2  {^X}    {{[X] Y D L S} {[X] J P K R} {[X] S B X Y}}
  3  {^X Y}  {{[X] [Y] D L S} {D [Y] P O I...[X] J P K R} {[X] S B X [Y]}}
} {
  set rev [lreverse $res]

  do_execsql_test 1.3.$tn.1 {
    SELECT snippet(x1, '[', ']', '...') FROM x1 WHERE x1 MATCH $match
  } $res

  do_execsql_test 1.3.$tn.2 {
    SELECT snippet(x2, '[', ']', '...') FROM x2 WHERE x2 MATCH $match
  } $rev
}

# Test matchinfo().
#
foreach {tn match res} {
  1  {^K}    {
                {1 3 3 0 0 0 0 0 0}
                {1 3 3 0 0 0 0 0 0}
                {1 3 3 0 0 0 0 0 0}
             }
  2  {^X}    {
                {0 1 1 0 1 1 1 2 2}
                {0 1 1 1 1 1 0 2 2}
                {1 1 1 0 1 1 1 2 2}
             }
  3  {^X Y}  {
                {0 1 1 0 1 1 1 2 2 0 6 5 0 5 4 1 4 4} 
                {0 1 1 1 1 1 0 2 2 1 6 5 0 5 4 0 4 4} 
                {1 1 1 0 1 1 1 2 2 1 6 5 0 5 4 1 4 4}
             }
} {
  set rev [lreverse $res]

  do_execsql_test 1.3.$tn.1 {
    SELECT mit(matchinfo(x1, 'x')) FROM x1 WHERE x1 MATCH $match
  } $res
  do_execsql_test 1.3.$tn.2 {
    SELECT mit(matchinfo(x2, 'x')) FROM x2 WHERE x2 MATCH $match
  } $rev
}

# Test that ^ is ignored for FTS3 tables.
#
do_execsql_test 2.1 {
  CREATE VIRTUAL TABLE x3 USING fts3;
  INSERT INTO x3 VALUES('A B C');
  INSERT INTO x3 VALUES('B A C');

  CREATE VIRTUAL TABLE x4 USING fts4;
  INSERT INTO x4 VALUES('A B C');
  INSERT INTO x4 VALUES('B A C');
}

do_execsql_test 2.2.1 {
  SELECT * FROM x3 WHERE x3 MATCH '^A';
} {{A B C} {B A C}}
do_execsql_test 2.2.2 {
  SELECT * FROM x4 WHERE x4 MATCH '^A';
} {{A B C}}

finish_test
