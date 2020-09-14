# 2011 June 10
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If this build does not include FTS3, skip the tests in this file.
#
ifcapable !fts3 { finish_test ; return }
source $testdir/fts3_common.tcl
source $testdir/malloc_common.tcl

set testprefix fts3auto
set sfep $sqlite_fts3_enable_parentheses
set sqlite_fts3_enable_parentheses 1

#--------------------------------------------------------------------------
# Start of Tcl infrastructure used by tests. The entry points are:
#
#   do_fts3query_test
#   fts3_make_deferrable
#   fts3_zero_long_segments 
#

#
#    do_fts3query_test TESTNAME ?OPTIONS? TABLE MATCHEXPR
#
# This proc runs several test cases on FTS3/4 table $TABLE using match
# expression $MATCHEXPR. All documents in $TABLE must be formatted so that
# they can be "tokenized" using the Tcl list commands (llength, lindex etc.).
# The name and column names used by $TABLE must not require any quoting or
# escaping when used in SQL statements.
#
# $MATCHINFO may be any expression accepted by the FTS4 MATCH operator, 
# except that the "<column-name>:token" syntax is not supported. Tcl list
# commands are used to tokenize the expression. Any parenthesis must appear
# either as separate list elements, or as the first (for opening) or last
# (for closing) character of a list element. i.e. the expression "(a OR b)c"
# will not be parsed correctly, but "( a OR b) c" will.
#
# Available OPTIONS are:
#
#     -deferred TOKENLIST
#
# If the "deferred" option is supplied, it is passed a list of tokens that
# are deferred by FTS and result in the relevant matchinfo() stats being an
# approximation. 
#
set sqlite_fts3_enable_parentheses 1
proc do_fts3query_test {tn args} {

  set nArg [llength $args]
  if {$nArg < 2 || ($nArg % 2)} {
    set cmd do_fts3query_test
    error "wrong # args: should be \"$cmd ?-deferred LIST? TABLE MATCHEXPR\""
  }
  set tbl   [lindex $args [expr $nArg-2]]
  set match [lindex $args [expr $nArg-1]]
  set deferred [list]

  foreach {k v} [lrange $args 0 [expr $nArg-3]] {
    switch -- $k {
      -deferred {
        ifcapable fts4_deferred { set deferred $v }
      }
      default {
        error "bad option \"$k\": must be -deferred"
      }
    }
  }

  get_near_results $tbl $match $deferred aHit
  get_near_results $tbl [string map {AND OR} $match] $deferred aMatchinfo

  set matchinfo_asc [list]
  foreach docid [lsort -integer -incr [array names aHit]] {
    lappend matchinfo_asc $docid $aMatchinfo($docid)
  }
  set matchinfo_desc [list]
  foreach docid [lsort -integer -decr [array names aHit]] {
    lappend matchinfo_desc $docid $aMatchinfo($docid)
  }

  set title "(\"$match\" -> [llength [array names aHit]] rows)"

  do_execsql_test $tn$title.1 "
    SELECT docid FROM $tbl WHERE $tbl MATCH '$match' ORDER BY docid ASC
  " [lsort -integer -incr [array names aHit]] 

  do_execsql_test $tn$title.2 "
    SELECT docid FROM $tbl WHERE $tbl MATCH '$match' ORDER BY docid DESC
  " [lsort -integer -decr [array names aHit]] 

  do_execsql_test $tn$title.3 "
    SELECT docid, mit(matchinfo($tbl, 'x')) FROM $tbl 
    WHERE $tbl MATCH '$match' ORDER BY docid DESC
  " $matchinfo_desc

  do_execsql_test $tn$title.4 "
    SELECT docid, mit(matchinfo($tbl, 'x')) FROM $tbl 
    WHERE $tbl MATCH '$match' ORDER BY docid ASC
  " $matchinfo_asc
}

#    fts3_make_deferrable TABLE TOKEN ?NROW?
#
proc fts3_make_deferrable {tbl token {nRow 0}} {

  set stmt [sqlite3_prepare db "SELECT * FROM $tbl" -1 dummy]
  set name [sqlite3_column_name $stmt 0]
  sqlite3_finalize $stmt

  if {$nRow==0} {
    set nRow [db one "SELECT count(*) FROM $tbl"]
  }
  set pgsz [db one "PRAGMA page_size"]
  execsql BEGIN
  for {set i 0} {$i < ($nRow * $pgsz * 1.2)/100} {incr i} {
    set doc [string repeat "$token " 100]
    execsql "INSERT INTO $tbl ($name) VALUES(\$doc)"
  }
  execsql "INSERT INTO $tbl ($name) VALUES('aaaaaaa ${token}aaaaa')"
  execsql COMMIT

  return [expr $nRow*$pgsz]
}

#    fts3_zero_long_segments TABLE ?LIMIT?
#
proc fts3_zero_long_segments {tbl limit} {
  sqlite3_db_config db DEFENSIVE 0
  execsql " 
    UPDATE ${tbl}_segments 
    SET block = zeroblob(length(block)) 
    WHERE length(block)>$limit
  "
  return [db changes]
}


proc mit {blob} {
  set scan(littleEndian) i*
  set scan(bigEndian) I*
  binary scan $blob $scan($::tcl_platform(byteOrder)) r
  return $r
}
db func mit mit

proc fix_phrase_expr {cols expr colfiltervar} {
  upvar $colfiltervar iColFilter

  set out [list]
  foreach t $expr {
    if {[string match *:* $t]} {
      set col [lindex [split $t :] 0]
      set t   [lindex [split $t :] 1]
      set iCol [lsearch $cols $col]
      if {$iCol<0} { error "unknown column: $col" }
      if {$iColFilter < 0} {
        set iColFilter $iCol
      } elseif {$iColFilter != $iCol} {
        set iColFilter [llength $cols]
      }
    }
    lappend out $t
  }

  return $out
}

proc fix_near_expr {cols expr colfiltervar} { 
  upvar $colfiltervar iColFilter
 
  set iColFilter -1

  set out [list]
  lappend out [fix_phrase_expr $cols [lindex $expr 0] iColFilter]
  foreach {a b} [lrange $expr 1 end] {
    if {[string match -nocase near $a]}   { set a 10 }
    if {[string match -nocase near/* $a]} { set a [string range $a 5 end] }
    lappend out $a
    lappend out [fix_phrase_expr $cols $b iColFilter]
  }
  return $out
}

proc get_single_near_results {tbl expr deferred arrayvar nullvar} {
  upvar $arrayvar aMatchinfo
  upvar $nullvar nullentry
  catch {array unset aMatchinfo}

  set cols [list]
  set miss [list]
  db eval "PRAGMA table_info($tbl)" A { lappend cols $A(name) ; lappend miss 0 }
  set expr [fix_near_expr $cols $expr iColFilter]

  # Calculate the expected results using [fts3_near_match]. The following
  # loop populates the "hits" and "counts" arrays as follows:
  # 
  #   1. For each document in the table that matches the NEAR expression,
  #      hits($docid) is set to 1. The set of docids that match the expression
  #      can therefore be found using [array names hits].
  #
  #   2. For each column of each document in the table, counts($docid,$iCol)
  #      is set to the -phrasecountvar output.
  #
  set res [list]
  catch { array unset hits }
  db eval "SELECT docid, * FROM $tbl" d {
    set iCol 0
    foreach col [lrange $d(*) 1 end] {
      set docid $d(docid)
      if {$iColFilter<0 || $iCol==$iColFilter} {
        set hit [fts3_near_match $d($col) $expr -p counts($docid,$iCol)]
        if {$hit} { set hits($docid) 1 }
      } else {
        set counts($docid,$iCol) $miss
      }
      incr iCol
    }
  }
  set nPhrase [expr ([llength $expr]+1)/2]
  set nCol $iCol

  # This block populates the nHit and nDoc arrays. For each phrase/column
  # in the query/table, array elements are set as follows:
  #
  #   nHit($iPhrase,$iCol) - Total number of hits for phrase $iPhrase in 
  #                          column $iCol.
  #
  #   nDoc($iPhrase,$iCol) - Number of documents with at least one hit for
  #                          phrase $iPhrase in column $iCol.
  #
  for {set iPhrase 0} {$iPhrase < $nPhrase} {incr iPhrase} {
    for {set iCol 0} {$iCol < $nCol} {incr iCol} {
      set nHit($iPhrase,$iCol) 0
      set nDoc($iPhrase,$iCol) 0
    }
  }
  foreach key [array names counts] {
    set iCol [lindex [split $key ,] 1]
    set iPhrase 0
    foreach c $counts($key) {
      if {$c>0} { incr nDoc($iPhrase,$iCol) 1 }
      incr nHit($iPhrase,$iCol) $c
      incr iPhrase
    }
  }

  if {[llength $deferred] && [llength $expr]==1} {
    set phrase [lindex $expr 0]
    set rewritten [list]
    set partial 0
    foreach tok $phrase {
      if {[lsearch $deferred $tok]>=0} {
        lappend rewritten *
      } else {
        lappend rewritten $tok
        set partial 1
      }
    }
    if {$partial==0} {
      set tblsize [db one "SELECT count(*) FROM $tbl"]
      for {set iCol 0} {$iCol < $nCol} {incr iCol} {
        set nHit(0,$iCol) $tblsize
        set nDoc(0,$iCol) $tblsize
      }
    } elseif {$rewritten != $phrase} {
      while {[lindex $rewritten end] == "*"} {
        set rewritten [lrange $rewritten 0 end-1]
      }
      while {[lindex $rewritten 0] == "*"} {
        set rewritten [lrange $rewritten 1 end]
      }
      get_single_near_results $tbl [list $rewritten] {} aRewrite nullentry
      foreach docid [array names hits] {
        set aMatchinfo($docid) $aRewrite($docid)
      }
      return
    }
  }

  # Set up the aMatchinfo array. For each document, set aMatchinfo($docid) to
  # contain the output of matchinfo('x') for the document.
  #
  foreach docid [array names hits] {
    set mi [list]
    for {set iPhrase 0} {$iPhrase<$nPhrase} {incr iPhrase} {
      for {set iCol 0} {$iCol<$nCol} {incr iCol} {
        lappend mi [lindex $counts($docid,$iCol) $iPhrase]
        lappend mi $nHit($iPhrase,$iCol)
        lappend mi $nDoc($iPhrase,$iCol)
      }
    }
    set aMatchinfo($docid) $mi
  }

  # Set up the nullentry output.
  #
  set nullentry [list]
  for {set iPhrase 0} {$iPhrase<$nPhrase} {incr iPhrase} {
    for {set iCol 0} {$iCol<$nCol} {incr iCol} {
      lappend nullentry 0 $nHit($iPhrase,$iCol) $nDoc($iPhrase,$iCol)
    }
  }
}


proc matching_brackets {expr} {
  if {[string range $expr 0 0]!="(" || [string range $expr end end] !=")"} { 
    return 0 
  }

  set iBracket 1
  set nExpr [string length $expr]
  for {set i 1} {$iBracket && $i < $nExpr} {incr i} {
    set c [string range $expr $i $i]
    if {$c == "("} {incr iBracket}
    if {$c == ")"} {incr iBracket -1}
  }

  return [expr ($iBracket==0 && $i==$nExpr)]
}

proc get_near_results {tbl expr deferred arrayvar {nullvar ""}} {
  upvar $arrayvar aMatchinfo
  if {$nullvar != ""} { upvar $nullvar nullentry }

  set expr [string trim $expr]
  while { [matching_brackets $expr] } {
    set expr [string trim [string range $expr 1 end-1]]
  }

  set prec(NOT) 1
  set prec(AND) 2
  set prec(OR)  3

  set currentprec 0
  set iBracket 0
  set expr_length [llength $expr]
  for {set i 0} {$i < $expr_length} {incr i} {
    set op [lindex $expr $i]
    if {$iBracket==0 && [info exists prec($op)] && $prec($op)>=$currentprec } {
      set opidx $i
      set currentprec $prec($op)
    } else {
      for {set j 0} {$j < [string length $op]} {incr j} {
        set c [string range $op $j $j]
        if {$c == "("} { incr iBracket +1 }
        if {$c == ")"} { incr iBracket -1 }
      }
    }
  }
  if {$iBracket!=0} { error "mismatched brackets in: $expr" }

  if {[info exists opidx]==0} {
    get_single_near_results $tbl $expr $deferred aMatchinfo nullentry
  } else {
    set eLeft  [lrange $expr 0 [expr $opidx-1]]
    set eRight [lrange $expr [expr $opidx+1] end]

    get_near_results $tbl $eLeft  $deferred aLeft  nullleft
    get_near_results $tbl $eRight $deferred aRight nullright

    switch -- [lindex $expr $opidx] {
      "NOT" {
        foreach hit [array names aLeft] {
          if {0==[info exists aRight($hit)]} {
            set aMatchinfo($hit) $aLeft($hit)
          }
        }
        set nullentry $nullleft
      }

      "AND" {
        foreach hit [array names aLeft] {
          if {[info exists aRight($hit)]} {
            set aMatchinfo($hit) [concat $aLeft($hit) $aRight($hit)]
          }
        }
        set nullentry [concat $nullleft $nullright]
      }

      "OR" {
        foreach hit [array names aLeft] {
          if {[info exists aRight($hit)]} {
            set aMatchinfo($hit) [concat $aLeft($hit) $aRight($hit)]
            unset aRight($hit)
          } else {
            set aMatchinfo($hit) [concat $aLeft($hit) $nullright]
          }
        }
        foreach hit [array names aRight] {
          set aMatchinfo($hit) [concat $nullleft $aRight($hit)]
        }

        set nullentry [concat $nullleft $nullright]
      }
    }
  }
}


# End of test procs. Actual tests are below this line.
#--------------------------------------------------------------------------

#--------------------------------------------------------------------------
# The following test cases - fts3auto-1.* - focus on testing the Tcl 
# command [fts3_near_match], which is used by other tests in this file.
#
proc test_fts3_near_match {tn doc expr res} {
  fts3_near_match $doc $expr -phrasecountvar p
  uplevel do_test [list $tn] [list [list set {} $p]] [list $res]
}

test_fts3_near_match 1.1.1 {a b c a b} a                   {2}
test_fts3_near_match 1.1.2 {a b c a b} {a 5 b 6 c}         {2 2 1}
test_fts3_near_match 1.1.3 {a b c a b} {"a b"}             {2}
test_fts3_near_match 1.1.4 {a b c a b} {"b c"}             {1}
test_fts3_near_match 1.1.5 {a b c a b} {"c c"}             {0}

test_fts3_near_match 1.2.1 "a b c d e f g" {b 2 f}         {0 0}
test_fts3_near_match 1.2.2 "a b c d e f g" {b 3 f}         {1 1}
test_fts3_near_match 1.2.3 "a b c d e f g" {f 2 b}         {0 0}
test_fts3_near_match 1.2.4 "a b c d e f g" {f 3 b}         {1 1}
test_fts3_near_match 1.2.5 "a b c d e f g" {"a b" 2 "f g"} {0 0}
test_fts3_near_match 1.2.6 "a b c d e f g" {"a b" 3 "f g"} {1 1}

set A "a b c d e f g h i j k l m n o p q r s t u v w x y z"
test_fts3_near_match 1.3.1 $A {"c d" 5 "i j" 1 "e f"}      {0 0 0}
test_fts3_near_match 1.3.2 $A {"c d" 5 "i j" 2 "e f"}      {1 1 1}

#--------------------------------------------------------------------------
# Test cases fts3auto-2.* run some simple tests using the 
# [do_fts3query_test] proc.
#
foreach {tn create} {
  1    "fts4(a, b)"
  2    "fts4(a, b, order=DESC)"
  3    "fts4(a, b, order=ASC)"
  4    "fts4(a, b, prefix=1)"
  5    "fts4(a, b, order=DESC, prefix=1)"
  6    "fts4(a, b, order=ASC, prefix=1)"
} {
  do_test 2.$tn.1 {
    catchsql { DROP TABLE t1 }
    execsql  "CREATE VIRTUAL TABLE t1 USING $create"
    for {set i 0} {$i<32} {incr i} {
      set doc [list]
      if {$i&0x01} {lappend doc one}
      if {$i&0x02} {lappend doc two}
      if {$i&0x04} {lappend doc three}
      if {$i&0x08} {lappend doc four}
      if {$i&0x10} {lappend doc five}
      execsql { INSERT INTO t1 VALUES($doc, null) }
    }
  } {}

  foreach {tn2 expr} {
    1     {one}
    2     {one NEAR/1 five}
    3     {t*}
    4     {t* NEAR/0 five}
    5     {o* NEAR/1 f*}
    6     {one NEAR five NEAR two NEAR four NEAR three}
    7     {one NEAR xyz}
    8     {one OR two}
    9     {one AND two}
    10    {one NOT two}
    11    {one AND two OR three}
    12    {three OR one AND two}
    13    {(three OR one) AND two}
    14    {(three OR one) AND two NOT (five NOT four)}
    15    {"one two"}
    16    {"one two" NOT "three four"}
  } {
    do_fts3query_test 2.$tn.2.$tn2 t1 $expr
  }
}

#--------------------------------------------------------------------------
# Some test cases involving deferred tokens.
#

foreach {tn create} {
  1    "fts4(x)"
  2    "fts4(x, order=DESC)"
} {
  catchsql { DROP TABLE t1 }
  execsql  "CREATE VIRTUAL TABLE t1 USING $create"
  do_execsql_test 3.$tn.1 {
    INSERT INTO t1(docid, x) VALUES(-2, 'a b c d e f g h i j k');
    INSERT INTO t1(docid, x) VALUES(-1, 'b c d e f g h i j k a');
    INSERT INTO t1(docid, x) VALUES(0, 'c d e f g h i j k a b');
    INSERT INTO t1(docid, x) VALUES(1, 'd e f g h i j k a b c');
    INSERT INTO t1(docid, x) VALUES(2, 'e f g h i j k a b c d');
    INSERT INTO t1(docid, x) VALUES(3, 'f g h i j k a b c d e');
    INSERT INTO t1(docid, x) VALUES(4, 'a c e g i k');
    INSERT INTO t1(docid, x) VALUES(5, 'a d g j');
    INSERT INTO t1(docid, x) VALUES(6, 'c a b');
  }

  set limit [fts3_make_deferrable t1 c]

  do_fts3query_test 3.$tn.2.1 t1 {a OR c}

  ifcapable fts4_deferred {
    do_test 3.$tn.3 { fts3_zero_long_segments t1 $limit } {1}
  }

  foreach {tn2 expr def} {
    1     {a NEAR c}            {}
    2     {a AND c}             c
    3     {"a c"}               c
    4     {"c a"}               c
    5     {"a c" NEAR/1 g}      {}
    6     {"a c" NEAR/0 g}      {}
  } {
    do_fts3query_test 3.$tn.4.$tn2 -deferred $def t1 $expr
  }
}

#--------------------------------------------------------------------------
# 
foreach {tn create} {
  1    "fts4(x, y)"
  2    "fts4(x, y, order=DESC)"
  3    "fts4(x, y, order=DESC, prefix=2)"
} {

  execsql [subst {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING $create;
    INSERT INTO t1 VALUES('one two five four five', '');
    INSERT INTO t1 VALUES('', 'one two five four five');
    INSERT INTO t1 VALUES('one two', 'five four five');
  }]

  do_fts3query_test 4.$tn.1.1 t1 {one AND five}
  do_fts3query_test 4.$tn.1.2 t1 {one NEAR five}
  do_fts3query_test 4.$tn.1.3 t1 {one NEAR/1 five}
  do_fts3query_test 4.$tn.1.4 t1 {one NEAR/2 five}
  do_fts3query_test 4.$tn.1.5 t1 {one NEAR/3 five}

  do_test 4.$tn.2 { 
    set limit [fts3_make_deferrable t1 five]
    execsql { INSERT INTO t1(t1) VALUES('optimize') }
    ifcapable fts4_deferred {
      expr {[fts3_zero_long_segments t1 $limit]>0}
    } else {
      expr 1
    }
  } {1}

  do_fts3query_test 4.$tn.3.1 -deferred five t1 {one AND five}
  do_fts3query_test 4.$tn.3.2 -deferred five t1 {one NEAR five}
  do_fts3query_test 4.$tn.3.3 -deferred five t1 {one NEAR/1 five}
  do_fts3query_test 4.$tn.3.4 -deferred five t1 {one NEAR/2 five}

  do_fts3query_test 4.$tn.3.5 -deferred five t1 {one NEAR/3 five}

  do_fts3query_test 4.$tn.4.1 -deferred fi* t1 {on* AND fi*}
  do_fts3query_test 4.$tn.4.2 -deferred fi* t1 {on* NEAR fi*}
  do_fts3query_test 4.$tn.4.3 -deferred fi* t1 {on* NEAR/1 fi*}
  do_fts3query_test 4.$tn.4.4 -deferred fi* t1 {on* NEAR/2 fi*}
  do_fts3query_test 4.$tn.4.5 -deferred fi* t1 {on* NEAR/3 fi*}

  ifcapable fts4_deferred {
    db eval {UPDATE t1_stat SET value=x'' WHERE id=0}
    do_catchsql_test 4.$tn.4.6 {
      SELECT docid FROM t1 WHERE t1 MATCH 'on* NEAR/3 fi*'
    } {1 {database disk image is malformed}}
  }
}

#--------------------------------------------------------------------------
# The following test cases - fts3auto-5.* - focus on using prefix indexes.
#
set chunkconfig [fts3_configure_incr_load 1 1]
foreach {tn create pending} {
  1    "fts4(a, b)"                                  1
  2    "fts4(a, b, order=ASC, prefix=1)"             1
  3    "fts4(a, b, order=ASC,  prefix=\"1,3\")"      0
  4    "fts4(a, b, order=DESC, prefix=\"2,4\")"      0
  5    "fts4(a, b, order=DESC, prefix=\"1\")"        0
  6    "fts4(a, b, order=ASC,  prefix=\"1,3\")"      0
} {

  execsql [subst {
    DROP TABLE IF EXISTS t1;
    CREATE VIRTUAL TABLE t1 USING $create;
  }]

  if {$pending} {execsql BEGIN}

  foreach {a b} {
    "the song of songs which is solomons"
    "let him kiss me with the kisses of his mouth for thy love is better than wine"
    "because of the savour of thy good ointments thy name is as ointment poured forth therefore do the virgins love thee"
    "draw me we will run after thee the king hath brought me into his chambers we will be glad and rejoice in thee we will remember thy love more than wine the upright love thee"
    "i am black but comely o ye daughters of jerusalem as the tents of kedar as the curtains of solomon"
    "look not upon me because i am black because the sun hath looked upon me my mothers children were angry with me they made me the keeper of the vineyards but mine own vineyard have i not kept"
    "tell me o thou whom my soul loveth where thou feedest where thou makest thy flock to rest at noon for why should i be as one that turneth aside by the flocks of thy companions?"
    "if thou know not o thou fairest among women go thy way forth by the footsteps of the flock and feed thy kids beside the shepherds tents"
    "i have compared thee o my love to a company of horses in pharaohs chariots"
    "thy cheeks are comely with rows of jewels thy neck with chains of gold"
    "we will make thee borders of gold with studs of silver"
    "while the king sitteth at his table my spikenard sendeth forth the smell thereof"
    "a bundle of myrrh is my wellbeloved unto me he shall lie all night betwixt my breasts"
    "my beloved is unto me as a cluster of camphire in the vineyards of en gedi"
    "behold thou art fair my love behold thou art fair thou hast doves eyes"
    "behold thou art fair my beloved yea pleasant also our bed is green"
    "the beams of our house are cedar and our rafters of fir"
  } {
    execsql {INSERT INTO t1(a, b) VALUES($a, $b)}
  }


  do_fts3query_test 5.$tn.1.1 t1 {s*}
  do_fts3query_test 5.$tn.1.2 t1 {so*}
  do_fts3query_test 5.$tn.1.3 t1 {"s* o*"}
  do_fts3query_test 5.$tn.1.4 t1 {b* NEAR/3 a*}
  do_fts3query_test 5.$tn.1.5 t1 {a*}
  do_fts3query_test 5.$tn.1.6 t1 {th* NEAR/5 a* NEAR/5 w*}
  do_fts3query_test 5.$tn.1.7 t1 {"b* th* art* fair*"}

  if {$pending} {execsql COMMIT}
}
eval fts3_configure_incr_load $chunkconfig

foreach {tn pending create} {
  1    0 "fts4(a, b, c, d)"
  2    1 "fts4(a, b, c, d)"
  3    0 "fts4(a, b, c, d, order=DESC)"
  4    1 "fts4(a, b, c, d, order=DESC)"
} {
  execsql [subst {
    DROP TABLE IF EXISTS t1;
    CREATE VIRTUAL TABLE t1 USING $create;
  }]


  if {$pending} { execsql BEGIN }

  foreach {a b c d} {
    "A B C" "D E F" "G H I" "J K L"
    "B C D" "E F G" "H I J" "K L A"
    "C D E" "F G H" "I J K" "L A B"
    "D E F" "G H I" "J K L" "A B C"
    "E F G" "H I J" "K L A" "B C D"
    "F G H" "I J K" "L A B" "C D E"
  } {
    execsql { INSERT INTO t1 VALUES($a, $b, $c, $d) }
  }

  do_fts3query_test 6.$tn.1 t1 {b:G}
  do_fts3query_test 6.$tn.2 t1 {b:G AND c:I}
  do_fts3query_test 6.$tn.3 t1 {b:G NEAR c:I}
  do_fts3query_test 6.$tn.4 t1 {a:C OR b:G OR c:K OR d:C}

  do_fts3query_test 6.$tn.5 t1 {a:G OR b:G}

  catchsql { COMMIT }
}

foreach {tn create} {
  1    "fts4(x)"
  2    "fts4(x, order=DESC)"
} {
  execsql [subst {
    DROP TABLE IF EXISTS t1;
    CREATE VIRTUAL TABLE t1 USING $create;
  }]

  foreach {x} {
    "F E N O T K X V A X I E X A P G Q V H U"
    "R V A E T C V Q N I E L O N U G J K L U"
    "U Y I G W M V F J L X I D C H F P J Q B"
    "S G D Z X R P G S S Y B K A S G A I L L"
    "L S I C H T Z S R Q P R N K J X L F M J"
    "C C C D P X B Z C M A D A C X S B T X V"
    "W Y J M D R G V R K B X S A W R I T N C"
    "P K L W T M S P O Y Y V V O E H Q A I R"
    "C D Y I C Z F H J C O Y A Q F L S B D K"
    "P G S C Y C Y V I M B D S Z D D Y W I E"
    "Z K Z U E E S F Y X T U A L W O U J C Q"
    "P A T Z S W L P L Q V Y Y I P W U X S S"
    "I U I H U O F Z F R H R F T N D X A G M"
    "N A B M S H K X S O Y D T X S B R Y H Z"
    "L U D A S K I L S V Z J P U B E B Y H M"
  } {
    execsql { INSERT INTO t1 VALUES($x) }
  }

  # Add extra documents to the database such that token "B" will be considered
  # deferrable if considering the other tokens means that 2 or fewer documents
  # will be loaded into memory.
  #
  fts3_make_deferrable t1 B 2

  # B is not deferred in either of the first two tests below, since filtering
  # on "M" or "D" returns 10 documents or so. But filtering on "M * D" only
  # returns 2, so B is deferred in this case.
  #
  do_fts3query_test 7.$tn.1             t1 {"M B"}
  do_fts3query_test 7.$tn.2             t1 {"B D"}
  do_fts3query_test 7.$tn.3 -deferred B t1 {"M B D"}
}

set sqlite_fts3_enable_parentheses $sfep
finish_test
