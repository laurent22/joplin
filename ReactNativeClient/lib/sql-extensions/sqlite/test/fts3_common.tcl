# 2009 November 04
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
# This file contains common code used the fts3 tests. At one point
# equivalent functionality was implemented in C code. But it is easier
# to use Tcl.
#

#-------------------------------------------------------------------------
# INSTRUCTIONS
#
# The following commands are available:
#
#   fts3_build_db_1 N
#     Using database handle [db] create an FTS4 table named t1 and populate
#     it with N rows of data. N must be less than 10,000. Refer to the
#     header comments above the proc implementation below for details.
#
#   fts3_build_db_2 N
#     Using database handle [db] create an FTS4 table named t2 and populate
#     it with N rows of data. N must be less than 100,000. Refer to the
#     header comments above the proc implementation below for details.
#
#   fts3_integrity_check TBL
#     TBL must be an FTS table in the database currently opened by handle
#     [db]. This proc loads and tokenizes all documents within the table,
#     then checks that the current contents of the FTS index matches the
#     results.
#
#   fts3_terms TBL WHERE
#     Todo.
#
#   fts3_doclist TBL TERM WHERE
#     Todo.
#
#
#

ifcapable fts3 {
  sqlite3_fts3_may_be_corrupt 0 
}

#-------------------------------------------------------------------------
# USAGE: fts3_build_db_1 SWITCHES N
#
# Build a sample FTS table in the database opened by database connection 
# [db]. The name of the new table is "t1".
#
proc fts3_build_db_1 {args} {

  set default(-module) fts4

  set nArg [llength $args]
  if {($nArg%2)==0} {
    error "wrong # args: should be \"fts3_build_db_1 ?switches? n\""
  }

  set n [lindex $args [expr $nArg-1]]
  array set opts [array get default]
  array set opts [lrange $args 0 [expr $nArg-2]]
  foreach k [array names opts] {
    if {0==[info exists default($k)]} { error "unknown option: $k" }
  }

  if {$n > 10000} {error "n must be <= 10000"}
  db eval "CREATE VIRTUAL TABLE t1 USING $opts(-module) (x, y)"

  set xwords [list zero one two three four five six seven eight nine ten]
  set ywords [list alpha beta gamma delta epsilon zeta eta theta iota kappa]

  for {set i 0} {$i < $n} {incr i} {
    set x ""
    set y ""

    set x [list]
    lappend x [lindex $xwords [expr ($i / 1000) % 10]]
    lappend x [lindex $xwords [expr ($i / 100)  % 10]]
    lappend x [lindex $xwords [expr ($i / 10)   % 10]]
    lappend x [lindex $xwords [expr ($i / 1)   % 10]]

    set y [list]
    lappend y [lindex $ywords [expr ($i / 1000) % 10]]
    lappend y [lindex $ywords [expr ($i / 100)  % 10]]
    lappend y [lindex $ywords [expr ($i / 10)   % 10]]
    lappend y [lindex $ywords [expr ($i / 1)   % 10]]

    db eval { INSERT INTO t1(docid, x, y) VALUES($i, $x, $y) }
  }
}

#-------------------------------------------------------------------------
# USAGE: fts3_build_db_2 N ARGS
#
# Build a sample FTS table in the database opened by database connection 
# [db]. The name of the new table is "t2".
#
proc fts3_build_db_2 {args} {

  set default(-module) fts4
  set default(-extra)   ""

  set nArg [llength $args]
  if {($nArg%2)==0} {
    error "wrong # args: should be \"fts3_build_db_1 ?switches? n\""
  }

  set n [lindex $args [expr $nArg-1]]
  array set opts [array get default]
  array set opts [lrange $args 0 [expr $nArg-2]]
  foreach k [array names opts] {
    if {0==[info exists default($k)]} { error "unknown option: $k" }
  }

  if {$n > 100000} {error "n must be <= 100000"}

  set sql "CREATE VIRTUAL TABLE t2 USING $opts(-module) (content"
  if {$opts(-extra) != ""} {
    append sql ", " $opts(-extra)
  }
  append sql ")"
  db eval $sql

  set chars [list a b c d e f g h  i j k l m n o p  q r s t u v w x  y z ""]

  for {set i 0} {$i < $n} {incr i} {
    set word ""
    set nChar [llength $chars]
    append word [lindex $chars [expr {($i / 1)   % $nChar}]]
    append word [lindex $chars [expr {($i / $nChar)  % $nChar}]]
    append word [lindex $chars [expr {($i / ($nChar*$nChar)) % $nChar}]]

    db eval { INSERT INTO t2(docid, content) VALUES($i, $word) }
  }
}

#-------------------------------------------------------------------------
# USAGE: fts3_integrity_check TBL
#
# This proc is used to verify that the full-text index is consistent with
# the contents of the fts3 table. In other words, it checks that the
# data in the %_contents table matches that in the %_segdir and %_segments 
# tables.
#
# This is not an efficient procedure. It uses a lot of memory and a lot
# of CPU. But it is better than not checking at all.
#
# The procedure is:
#
#   1) Read the entire full-text index from the %_segdir and %_segments
#      tables into memory. For each entry in the index, the following is
#      done:
#
#          set C($iDocid,$iCol,$iPosition) $zTerm
#
#   2) Iterate through each column of each row of the %_content table. 
#      Tokenize all documents, and check that for each token there is
#      a corresponding entry in the $C array. After checking a token,
#      [unset] the $C array entry.
#
#   3) Check that array $C is now empty.
#      
#
proc fts3_integrity_check {tbl} {

  fts3_read2 $tbl 1 A

  foreach zTerm [array names A] {
    #puts $zTerm
    foreach doclist $A($zTerm) {
      set docid 0
      while {[string length $doclist]>0} {
        set iCol 0
        set iPos 0
        set lPos [list]
        set lCol [list]

        # First varint of a doclist-entry is the docid. Delta-compressed
        # with respect to the docid of the previous entry.
        #
        incr docid [gobble_varint doclist]
        if {[info exists D($zTerm,$docid)]} {
          while {[set iDelta [gobble_varint doclist]] != 0} {}
          continue
        }
        set D($zTerm,$docid) 1

        # Gobble varints until the 0x00 that terminates the doclist-entry
        # is found.
        while {[set iDelta [gobble_varint doclist]] > 0} {
          if {$iDelta == 1} {
            set iCol [gobble_varint doclist]
            set iPos 0
          } else {
            incr iPos $iDelta
            incr iPos -2
            set C($docid,$iCol,$iPos) $zTerm
          }
        }
      }
    }
  }

  foreach key [array names C] {
    #puts "$key -> $C($key)"
  }


  db eval "SELECT * FROM ${tbl}_content" E {
    set iCol 0
    set iDoc $E(docid)
    foreach col [lrange $E(*) 1 end] {
      set c $E($col)
      set sql {SELECT fts3_tokenizer_test('simple', $c)}

      foreach {pos term dummy} [db one $sql] {
        if {![info exists C($iDoc,$iCol,$pos)]} {
          set es "Error at docid=$iDoc col=$iCol pos=$pos. Index is missing"
          lappend errors $es
        } else {
          if {[string compare $C($iDoc,$iCol,$pos) $term]} {
            set    es "Error at docid=$iDoc col=$iCol pos=$pos. Index "
            append es "has \"$C($iDoc,$iCol,$pos)\", document has \"$term\""
            lappend errors $es
          }
          unset C($iDoc,$iCol,$pos)
        }
      }
      incr iCol
    }
  }

  foreach c [array names C] {
    lappend errors "Bad index entry: $c -> $C($c)"
  }

  if {[info exists errors]} { return [join $errors "\n"] }
  return "ok"
}

# USAGE: fts3_terms TBL WHERE
#
# Argument TBL must be the name of an FTS3 table. Argument WHERE is an
# SQL expression that will be used as the WHERE clause when scanning
# the %_segdir table. As in the following query:
#
#   "SELECT * FROM ${TBL}_segdir WHERE ${WHERE}"
#
# This function returns a list of all terms present in the segments
# selected by the statement above.
#
proc fts3_terms {tbl where} {
  fts3_read $tbl $where a
  return [lsort [array names a]]
}


# USAGE: fts3_doclist TBL TERM WHERE
#
# Argument TBL must be the name of an FTS3 table. TERM is a term that may
# or may not be present in the table. Argument WHERE is used to select a 
# subset of the b-tree segments in the associated full-text index as 
# described above for [fts3_terms].
#
# This function returns the results of merging the doclists associated
# with TERM in the selected segments. Each doclist is an element of the
# returned list. Each doclist is formatted as follows:
#
#   [$docid ?$col[$off1 $off2...]?...]
#
# The formatting is odd for a Tcl command in order to be compatible with
# the original C-language implementation. If argument WHERE is "1", then 
# any empty doclists are omitted from the returned list.
#
proc fts3_doclist {tbl term where} {
  fts3_read $tbl $where a


  foreach doclist $a($term) {
    set docid 0

    while {[string length $doclist]>0} {
      set iCol 0
      set iPos 0
      set lPos [list]
      set lCol [list]
      incr docid [gobble_varint doclist]
  
      while {[set iDelta [gobble_varint doclist]] > 0} {
        if {$iDelta == 1} {
          lappend lCol [list $iCol $lPos]
          set iPos 0
          set lPos [list]
          set iCol [gobble_varint doclist]
        } else {
          incr iPos $iDelta
          incr iPos -2
          lappend lPos $iPos
        }
      }
  
      if {[llength $lPos]>0} {
        lappend lCol [list $iCol $lPos]
      }
  
      if {$where != "1" || [llength $lCol]>0} {
        set ret($docid) $lCol
      } else {
        unset -nocomplain ret($docid)
      }
    }
  }

  set lDoc [list]
  foreach docid [lsort -integer [array names ret]] {
    set lCol [list]
    set cols ""
    foreach col $ret($docid) {
      foreach {iCol lPos} $col {}
      append cols " $iCol\[[join $lPos { }]\]"
    }
    lappend lDoc "\[${docid}${cols}\]"
  }

  join $lDoc " "
}

###########################################################################

proc gobble_varint {varname} {
  upvar $varname blob
  set n [read_fts3varint $blob ret]
  set blob [string range $blob $n end]
  return $ret
}
proc gobble_string {varname nLength} {
  upvar $varname blob
  set ret [string range $blob 0 [expr $nLength-1]]
  set blob [string range $blob $nLength end]
  return $ret
}

# The argument is a blob of data representing an FTS3 segment leaf. 
# Return a list consisting of alternating terms (strings) and doclists
# (blobs of data).
#
proc fts3_readleaf {blob} {
  set zPrev ""
  set terms [list]

  while {[string length $blob] > 0} {
    set nPrefix [gobble_varint blob]
    set nSuffix [gobble_varint blob]

    set zTerm [string range $zPrev 0 [expr $nPrefix-1]]
    append zTerm [gobble_string blob $nSuffix]
    set nDoclist [gobble_varint blob]
    set doclist [gobble_string blob $nDoclist]

    lappend terms $zTerm $doclist
    set zPrev $zTerm
  }

  return $terms
}

proc fts3_read2 {tbl where varname} {
  upvar $varname a
  array unset a
  db eval " SELECT start_block, leaves_end_block, root 
            FROM ${tbl}_segdir WHERE $where
            ORDER BY level ASC, idx DESC
  " {
    set c 0
    binary scan $root c c
    if {$c==0} {
      foreach {t d} [fts3_readleaf $root] { lappend a($t) $d }
    } else {
      db eval " SELECT block 
                FROM ${tbl}_segments 
                WHERE blockid>=$start_block AND blockid<=$leaves_end_block
                ORDER BY blockid
      " {
        foreach {t d} [fts3_readleaf $block] { lappend a($t) $d }
      }
    }
  }
}

proc fts3_read {tbl where varname} {
  upvar $varname a
  array unset a
  db eval " SELECT start_block, leaves_end_block, root 
            FROM ${tbl}_segdir WHERE $where
            ORDER BY level DESC, idx ASC
  " {
    if {$start_block == 0} {
      foreach {t d} [fts3_readleaf $root] { lappend a($t) $d }
    } else {
      db eval " SELECT block 
                FROM ${tbl}_segments 
                WHERE blockid>=$start_block AND blockid<$leaves_end_block
                ORDER BY blockid
      " {
        foreach {t d} [fts3_readleaf $block] { lappend a($t) $d }

      }
    }
  }
}

##########################################################################

