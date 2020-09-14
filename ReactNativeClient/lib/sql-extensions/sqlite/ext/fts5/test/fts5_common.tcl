# 2014 Dec 19
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

if {![info exists testdir]} {
  set testdir [file join [file dirname [info script]] .. .. .. test]
}
source $testdir/tester.tcl

ifcapable !fts5 {
  proc return_if_no_fts5 {} {
    finish_test
    return -code return
  }
  return
} else {
  proc return_if_no_fts5 {} {}
}

catch { 
  sqlite3_fts5_may_be_corrupt 0 
  reset_db
}

proc fts5_test_poslist {cmd} {
  set res [list]
  for {set i 0} {$i < [$cmd xInstCount]} {incr i} {
    lappend res [string map {{ } .} [$cmd xInst $i]]
  }
  set res
}

proc fts5_test_poslist2 {cmd} {
  set res [list]

  for {set i 0} {$i < [$cmd xPhraseCount]} {incr i} {
    $cmd xPhraseForeach $i c o {
      lappend res $i.$c.$o
    }
  }

  #set res
  sort_poslist $res
}

proc fts5_test_collist {cmd} {
  set res [list]

  for {set i 0} {$i < [$cmd xPhraseCount]} {incr i} {
    $cmd xPhraseColumnForeach $i c { lappend res $i.$c }
  }

  set res
}

proc fts5_test_columnsize {cmd} {
  set res [list]
  for {set i 0} {$i < [$cmd xColumnCount]} {incr i} {
    lappend res [$cmd xColumnSize $i]
  }
  set res
}

proc fts5_test_columntext {cmd} {
  set res [list]
  for {set i 0} {$i < [$cmd xColumnCount]} {incr i} {
    lappend res [$cmd xColumnText $i]
  }
  set res
}

proc fts5_test_columntotalsize {cmd} {
  set res [list]
  for {set i 0} {$i < [$cmd xColumnCount]} {incr i} {
    lappend res [$cmd xColumnTotalSize $i]
  }
  set res
}

proc test_append_token {varname token iStart iEnd} {
  upvar $varname var
  lappend var $token
  return "SQLITE_OK"
}
proc fts5_test_tokenize {cmd} {
  set res [list]
  for {set i 0} {$i < [$cmd xColumnCount]} {incr i} {
    set tokens [list]
    $cmd xTokenize [$cmd xColumnText $i] [list test_append_token tokens]
    lappend res $tokens
  }
  set res
}

proc fts5_test_rowcount {cmd} {
  $cmd xRowCount
}

proc test_queryphrase_cb {cnt cmd} {
  upvar $cnt L 
  for {set i 0} {$i < [$cmd xInstCount]} {incr i} {
    foreach {ip ic io} [$cmd xInst $i] break
    set A($ic) 1
  }
  foreach ic [array names A] {
    lset L $ic [expr {[lindex $L $ic] + 1}]
  }
}
proc fts5_test_queryphrase {cmd} {
  set res [list]
  for {set i 0} {$i < [$cmd xPhraseCount]} {incr i} {
    set cnt [list]
    for {set j 0} {$j < [$cmd xColumnCount]} {incr j} { lappend cnt 0 }
    $cmd xQueryPhrase $i [list test_queryphrase_cb cnt]
    lappend res $cnt
  }
  set res
}

proc fts5_test_phrasecount {cmd} {
  $cmd xPhraseCount
}

proc fts5_test_all {cmd} {
  set res [list]
  lappend res columnsize      [fts5_test_columnsize $cmd]
  lappend res columntext      [fts5_test_columntext $cmd]
  lappend res columntotalsize [fts5_test_columntotalsize $cmd]
  lappend res poslist         [fts5_test_poslist $cmd]
  lappend res tokenize        [fts5_test_tokenize $cmd]
  lappend res rowcount        [fts5_test_rowcount $cmd]
  set res
}

proc fts5_aux_test_functions {db} {
  foreach f {
    fts5_test_columnsize
    fts5_test_columntext
    fts5_test_columntotalsize
    fts5_test_poslist
    fts5_test_poslist2
    fts5_test_collist
    fts5_test_tokenize
    fts5_test_rowcount
    fts5_test_all

    fts5_test_queryphrase
    fts5_test_phrasecount
  } {
    sqlite3_fts5_create_function $db $f $f
  }
}

proc fts5_segcount {tbl} {
  set N 0
  foreach n [fts5_level_segs $tbl] { incr N $n }
  set N
}

proc fts5_level_segs {tbl} {
  set sql "SELECT fts5_decode(rowid,block) aS r FROM ${tbl}_data WHERE rowid=10"
  set ret [list]
  foreach L [lrange [db one $sql] 1 end] {
    lappend ret [expr [llength $L] - 3]
  }
  set ret
} 

proc fts5_level_segids {tbl} {
  set sql "SELECT fts5_decode(rowid,block) aS r FROM ${tbl}_data WHERE rowid=10"
  set ret [list]
  foreach L [lrange [db one $sql] 1 end] {
    set lvl [list]
    foreach S [lrange $L 3 end] {
      regexp {id=([1234567890]*)} $S -> segid
      lappend lvl $segid
    }
    lappend ret $lvl
  }
  set ret
}

proc fts5_rnddoc {n} {
  set map [list 0 a  1 b  2 c  3 d  4 e  5 f  6 g  7 h  8 i  9 j]
  set doc [list]
  for {set i 0} {$i < $n} {incr i} {
    lappend doc "x[string map $map [format %.3d [expr int(rand()*1000)]]]"
  }
  set doc
}

#-------------------------------------------------------------------------
# Usage:
#
#   nearset aCol ?-pc VARNAME? ?-near N? ?-col C? -- phrase1 phrase2...
#
# This command is used to test if a document (set of column values) matches
# the logical equivalent of a single FTS5 NEAR() clump and, if so, return
# the equivalent of an FTS5 position list.
#
# Parameter $aCol is passed a list of the column values for the document
# to test. Parameters $phrase1 and so on are the phrases.
#
# The result is a list of phrase hits. Each phrase hit is formatted as
# three integers separated by "." characters, in the following format:
#
#   <phrase number> . <column number> . <token offset>
#
# Options:
#
#   -near N        (NEAR distance. Default 10)
#   -col  C        (List of column indexes to match against)
#   -pc   VARNAME  (variable in caller frame to use for phrase numbering)
#   -dict VARNAME  (array in caller frame to use for synonyms)
#
proc nearset {aCol args} {

  # Process the command line options.
  #
  set O(-near) 10
  set O(-col)  {}
  set O(-pc)   ""
  set O(-dict) ""

  set nOpt [lsearch -exact $args --]
  if {$nOpt<0} { error "no -- option" }

  # Set $lPhrase to be a list of phrases. $nPhrase its length.
  set lPhrase [lrange $args [expr $nOpt+1] end]
  set nPhrase [llength $lPhrase]

  foreach {k v} [lrange $args 0 [expr $nOpt-1]] {
    if {[info exists O($k)]==0} { error "unrecognized option $k" }
    set O($k) $v
  }

  if {$O(-pc) == ""} {
    set counter 0
  } else {
    upvar $O(-pc) counter
  }

  if {$O(-dict)!=""} { upvar $O(-dict) aDict }

  for {set j 0} {$j < [llength $aCol]} {incr j} {
    for {set i 0} {$i < $nPhrase} {incr i} { 
      set A($j,$i) [list]
    }
  }

  # Loop through each column of the current row.
  for {set iCol 0} {$iCol < [llength $aCol]} {incr iCol} {

    # If there is a column filter, test whether this column is excluded. If
    # so, skip to the next iteration of this loop. Otherwise, set zCol to the
    # column value and nToken to the number of tokens that comprise it.
    if {$O(-col)!="" && [lsearch $O(-col) $iCol]<0} continue
    set zCol [lindex $aCol $iCol]
    set nToken [llength $zCol]

    # Each iteration of the following loop searches a substring of the 
    # column value for phrase matches. The last token of the substring
    # is token $iLast of the column value. The first token is:
    #
    #   iFirst = ($iLast - $O(-near) - 1)
    #
    # where $sz is the length of the phrase being searched for. A phrase 
    # counts as matching the substring if its first token lies on or before
    # $iLast and its last token on or after $iFirst.
    #
    # For example, if the query is "NEAR(a+b c, 2)" and the column value:
    #
    #   "x x x x A B x x C x"
    #    0 1 2 3 4 5 6 7 8 9"
    #
    # when (iLast==8 && iFirst=5) the range will contain both phrases and
    # so both instances can be added to the output poslists.
    #
    set iLast [expr $O(-near) >= $nToken ? $nToken - 1 : $O(-near)]
    for { } {$iLast < $nToken} {incr iLast} {

      catch { array unset B }
      
      for {set iPhrase 0} {$iPhrase<$nPhrase} {incr iPhrase} {
        set p [lindex $lPhrase $iPhrase]
        set nPm1 [expr {[llength $p] - 1}]
        set iFirst [expr $iLast - $O(-near) - [llength $p]]

        for {set i $iFirst} {$i <= $iLast} {incr i} {
          set lCand [lrange $zCol $i [expr $i+$nPm1]]
          set bMatch 1
          foreach tok $p term $lCand {
            if {[nearset_match aDict $tok $term]==0} { set bMatch 0 ; break }
          }
          if {$bMatch} { lappend B($iPhrase) $i }
        }

        if {![info exists B($iPhrase)]} break
      }

      if {$iPhrase==$nPhrase} {
        for {set iPhrase 0} {$iPhrase<$nPhrase} {incr iPhrase} {
          set A($iCol,$iPhrase) [concat $A($iCol,$iPhrase) $B($iPhrase)]
          set A($iCol,$iPhrase) [lsort -integer -uniq $A($iCol,$iPhrase)]
        }
      }
    }
  }

  set res [list]
  #puts [array names A]

  for {set iPhrase 0} {$iPhrase<$nPhrase} {incr iPhrase} {
    for {set iCol 0} {$iCol < [llength $aCol]} {incr iCol} {
      foreach a $A($iCol,$iPhrase) {
        lappend res "$counter.$iCol.$a"
      }
    }
    incr counter
  }

  #puts "$aCol -> $res"
  sort_poslist $res
}

proc nearset_match {aDictVar tok term} {
  if {[string match $tok $term]} { return 1 }

  upvar $aDictVar aDict
  if {[info exists aDict($tok)]} {
    foreach s $aDict($tok) {
      if {[string match $s $term]} { return 1 }
    }
  }
  return 0;
}

#-------------------------------------------------------------------------
# Usage:
#
#   sort_poslist LIST
#
# Sort a position list of the type returned by command [nearset]
#
proc sort_poslist {L} {
  lsort -command instcompare $L
}
proc instcompare {lhs rhs} {
  foreach {p1 c1 o1} [split $lhs .] {}
  foreach {p2 c2 o2} [split $rhs .] {}

  set res [expr $c1 - $c2]
  if {$res==0} { set res [expr $o1 - $o2] }
  if {$res==0} { set res [expr $p1 - $p2] }

  return $res
}

#-------------------------------------------------------------------------
# Logical operators used by the commands returned by fts5_tcl_expr().
#
proc AND {args} {
  foreach a $args {
    if {[llength $a]==0} { return [list] }
  }
  sort_poslist [concat {*}$args]
}
proc OR {args} {
  sort_poslist [concat {*}$args]
}
proc NOT {a b} {
  if {[llength $b]>0} { return [list] }
  return $a
}

#-------------------------------------------------------------------------
# This command is similar to [split], except that it also provides the
# start and end offsets of each token. For example:
#
#   [fts5_tokenize_split "abc d ef"] -> {abc 0 3 d 4 5 ef 6 8}
#

proc gobble_whitespace {textvar} {
  upvar $textvar t
  regexp {([ ]*)(.*)} $t -> space t
  return [string length $space]
}

proc gobble_text {textvar wordvar} {
  upvar $textvar t
  upvar $wordvar w
  regexp {([^ ]*)(.*)} $t -> w t
  return [string length $w]
}

proc fts5_tokenize_split {text} {
  set token ""
  set ret [list]
  set iOff [gobble_whitespace text]
  while {[set nToken [gobble_text text word]]} {
    lappend ret $word $iOff [expr $iOff+$nToken]
    incr iOff $nToken
    incr iOff [gobble_whitespace text]
  }

  set ret
}

#-------------------------------------------------------------------------
#
proc foreach_detail_mode {prefix script} {
  set saved $::testprefix
  foreach d [list full col none] {
    set s [string map [list %DETAIL% $d] $script]
    set ::detail $d
    set ::testprefix "$prefix-$d"
    reset_db
    uplevel $s
    unset ::detail
  }
  set ::testprefix $saved
}

proc detail_check {} {
  if {$::detail != "none" && $::detail!="full" && $::detail!="col"} {
    error "not in foreach_detail_mode {...} block"
  }
}
proc detail_is_none {} { detail_check ; expr {$::detail == "none"} }
proc detail_is_col {}  { detail_check ; expr {$::detail == "col" } }
proc detail_is_full {} { detail_check ; expr {$::detail == "full"} }


#-------------------------------------------------------------------------
# Convert a poslist of the type returned by fts5_test_poslist() to a 
# collist as returned by fts5_test_collist().
#
proc fts5_poslist2collist {poslist} {
  set res [list]
  foreach h $poslist {
    regexp {(.*)\.[1234567890]+} $h -> cand
    lappend res $cand
  }
  set res [lsort -command fts5_collist_elem_compare -unique $res]
  return $res
}

# Comparison function used by fts5_poslist2collist to sort collist entries.
proc fts5_collist_elem_compare {a b} {
  foreach {a1 a2} [split $a .] {}
  foreach {b1 b2} [split $b .] {}

  if {$a1==$b1} { return [expr $a2 - $b2] }
  return [expr $a1 - $b1]
}


#--------------------------------------------------------------------------
# Construct and return a tcl list equivalent to that returned by the SQL
# query executed against database handle [db]:
#
#   SELECT 
#     rowid, 
#     fts5_test_poslist($tbl),
#     fts5_test_collist($tbl) 
#   FROM $tbl('$expr')
#   ORDER BY rowid $order;
#
proc fts5_query_data {expr tbl {order ASC} {aDictVar ""}} {

  # Figure out the set of columns in the FTS5 table. This routine does
  # not handle tables with UNINDEXED columns, but if it did, it would
  # have to be here.
  db eval "PRAGMA table_info = $tbl" x { lappend lCols $x(name) }

  set d ""
  if {$aDictVar != ""} {
    upvar $aDictVar aDict
    set d aDict
  }

  set cols ""
  foreach e $lCols { append cols ", '$e'" }
  set tclexpr [db one [subst -novar {
    SELECT fts5_expr_tcl( $expr, 'nearset $cols -dict $d -pc ::pc' [set cols] )
  }]]

  set res [list]
  db eval "SELECT rowid, * FROM $tbl ORDER BY rowid $order" x {
    set cols [list]
    foreach col $lCols { lappend cols $x($col) }
    
    set ::pc 0
    set rowdata [eval $tclexpr]
    if {$rowdata != ""} { 
      lappend res $x(rowid) $rowdata [fts5_poslist2collist $rowdata]
    }
  }

  set res
}

#-------------------------------------------------------------------------
# Similar to [fts5_query_data], but omit the collist field.
#
proc fts5_poslist_data {expr tbl {order ASC} {aDictVar ""}} {
  set res [list]

  if {$aDictVar!=""} {
    upvar $aDictVar aDict
    set dict aDict
  } else {
    set dict ""
  }

  foreach {rowid poslist collist} [fts5_query_data $expr $tbl $order $dict] {
    lappend res $rowid $poslist
  }
  set res
}

proc fts5_collist_data {expr tbl {order ASC} {aDictVar ""}} {
  set res [list]

  if {$aDictVar!=""} {
    upvar $aDictVar aDict
    set dict aDict
  } else {
    set dict ""
  }

  foreach {rowid poslist collist} [fts5_query_data $expr $tbl $order $dict] {
    lappend res $rowid $collist
  }
  set res
}

#-------------------------------------------------------------------------
#

# This command will only work inside a [foreach_detail_mode] block. It tests
# whether or not expression $expr run on FTS5 table $tbl is supported by
# the current mode. If so, 1 is returned. If not, 0.
#
#   detail=full    (all queries supported)
#   detail=col     (all but phrase queries and NEAR queries)
#   detail=none    (all but phrase queries, NEAR queries, and column filters)
#
proc fts5_expr_ok {expr tbl} {

  if {![detail_is_full]} {
    set nearset "nearset_rc"
    if {[detail_is_col]} { set nearset "nearset_rf" }

    set ::expr_not_ok 0
    db eval "PRAGMA table_info = $tbl" x { lappend lCols $x(name) }

    set cols ""
    foreach e $lCols { append cols ", '$e'" }
    set ::pc 0
    set tclexpr [db one [subst -novar {
      SELECT fts5_expr_tcl( $expr, '[set nearset] $cols -pc ::pc' [set cols] )
    }]]
    eval $tclexpr
    if {$::expr_not_ok} { return 0 }
  }

  return 1
}

# Helper for [fts5_expr_ok]
proc nearset_rf {aCol args} {
  set idx [lsearch -exact $args --]
  if {$idx != [llength $args]-2 || [llength [lindex $args end]]!=1} {
    set ::expr_not_ok 1
  }
  list
}

# Helper for [fts5_expr_ok]
proc nearset_rc {aCol args} {
  nearset_rf $aCol {*}$args
  if {[lsearch $args -col]>=0} { 
    set ::expr_not_ok 1
  }
  list
}


#-------------------------------------------------------------------------
# Code for a simple Tcl tokenizer that supports synonyms at query time.
#
proc tclnum_tokenize {mode tflags text} {
  foreach {w iStart iEnd} [fts5_tokenize_split $text] {
    sqlite3_fts5_token $w $iStart $iEnd
    if {$tflags == $mode && [info exists ::tclnum_syn($w)]} {
      foreach s $::tclnum_syn($w)  { sqlite3_fts5_token -colo $s $iStart $iEnd }
    }
  }
}

proc tclnum_create {args} {
  set mode query
  if {[llength $args]} {
    set mode [lindex $args 0]
  }
  if {$mode != "query" && $mode != "document"} { error "bad mode: $mode" }
  return [list tclnum_tokenize $mode]
}

proc fts5_tclnum_register {db} {
  foreach SYNDICT {
    {zero  0}
    {one   1 i}
    {two   2 ii}
    {three 3 iii}
    {four  4 iv}
    {five  5 v}
    {six   6 vi}
    {seven 7 vii}
    {eight 8 viii}
    {nine  9 ix}

    {a1 a2 a3 a4 a5 a6 a7 a8 a9}
    {b1 b2 b3 b4 b5 b6 b7 b8 b9}
    {c1 c2 c3 c4 c5 c6 c7 c8 c9}
  } {
    foreach s $SYNDICT {
      set o [list]
      foreach x $SYNDICT {if {$x!=$s} {lappend o $x}}
      set ::tclnum_syn($s) $o
    }
  }
  sqlite3_fts5_create_tokenizer db tclnum tclnum_create
}
#
# End of tokenizer code.
#-------------------------------------------------------------------------

