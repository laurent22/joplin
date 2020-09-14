#!/usr/bin/tclsh
#
# Run this script to generate the pragma name lookup table C code.
#
# To add new pragmas, first add the name and other relevant attributes
# of the pragma to the "pragma_def" object below.  Then run this script
# to generate the ../src/pragma.h header file that contains macros and
# the lookup table needed for pragma name lookup in the pragma.c module.
# Then add the extra "case PragTyp_XXXXX:" and subsequent code for the
# new pragma in ../src/pragma.c.
#

# Flag meanings:
set flagMeaning(NeedSchema) {Force schema load before running}
set flagMeaning(ReadOnly)   {Read-only HEADER_VALUE}
set flagMeaning(Result0)    {Acts as query when no argument}
set flagMeaning(Result1)    {Acts as query when has one argument}
set flagMeaning(SchemaReq)  {Schema required - "main" is default}
set flagMeaning(SchemaOpt)  {Schema restricts name search if present}
set flagMeaning(NoColumns)  {OP_ResultRow called with zero columns}
set flagMeaning(NoColumns1) {zero columns if RHS argument is present}

set pragma_def {
  NAME: full_column_names
  TYPE: FLAG
  ARG:  SQLITE_FullColNames
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: short_column_names
  TYPE: FLAG
  ARG:  SQLITE_ShortColNames
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: count_changes
  TYPE: FLAG
  ARG:  SQLITE_CountRows
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: empty_result_callbacks
  TYPE: FLAG
  ARG:  SQLITE_NullCallback
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: fullfsync
  TYPE: FLAG
  ARG:  SQLITE_FullFSync
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: checkpoint_fullfsync
  TYPE: FLAG
  ARG:  SQLITE_CkptFullFSync
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: cache_spill
  FLAG: Result0 SchemaReq NoColumns1
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: reverse_unordered_selects
  TYPE: FLAG
  ARG:  SQLITE_ReverseOrder
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: query_only
  TYPE: FLAG
  ARG:  SQLITE_QueryOnly
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: automatic_index
  TYPE: FLAG
  ARG:  SQLITE_AutoIndex
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   !defined(SQLITE_OMIT_AUTOMATIC_INDEX)

  NAME: sql_trace
  TYPE: FLAG
  ARG:  SQLITE_SqlTrace
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: vdbe_listing
  TYPE: FLAG
  ARG:  SQLITE_VdbeListing
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: vdbe_trace
  TYPE: FLAG
  ARG:  SQLITE_VdbeTrace
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: vdbe_addoptrace
  TYPE: FLAG
  ARG:  SQLITE_VdbeAddopTrace
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: vdbe_debug
  TYPE: FLAG
  ARG:  SQLITE_SqlTrace|SQLITE_VdbeListing|SQLITE_VdbeTrace
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: vdbe_eqp
  TYPE: FLAG
  ARG:  SQLITE_VdbeEQP
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: ignore_check_constraints
  TYPE: FLAG
  ARG:  SQLITE_IgnoreChecks
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   !defined(SQLITE_OMIT_CHECK)

  NAME: writable_schema
  TYPE: FLAG
  ARG:  SQLITE_WriteSchema|SQLITE_NoSchemaError
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: read_uncommitted
  TYPE: FLAG
  ARG:  SQLITE_ReadUncommit
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: recursive_triggers
  TYPE: FLAG
  ARG:  SQLITE_RecTriggers
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: trusted_schema
  TYPE: FLAG
  ARG:  SQLITE_TrustedSchema
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)

  NAME: foreign_keys
  TYPE: FLAG
  ARG:  SQLITE_ForeignKeys
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   !defined(SQLITE_OMIT_FOREIGN_KEY) && !defined(SQLITE_OMIT_TRIGGER)

  NAME: defer_foreign_keys
  TYPE: FLAG
  ARG:  SQLITE_DeferFKs
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   !defined(SQLITE_OMIT_FOREIGN_KEY) && !defined(SQLITE_OMIT_TRIGGER)

  NAME: cell_size_check
  TYPE: FLAG
  ARG:  SQLITE_CellSizeCk

  NAME: default_cache_size
  FLAG: NeedSchema Result0 SchemaReq NoColumns1
  COLS: cache_size
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS) && !defined(SQLITE_OMIT_DEPRECATED)

  NAME: page_size
  FLAG: Result0 SchemaReq NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: secure_delete
  FLAG: Result0
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: page_count
  FLAG: NeedSchema Result0 SchemaReq
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: max_page_count
  TYPE: PAGE_COUNT
  FLAG: NeedSchema Result0 SchemaReq
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: locking_mode
  FLAG: Result0 SchemaReq
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: journal_mode
  FLAG: NeedSchema Result0 SchemaReq
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: journal_size_limit
  FLAG: Result0 SchemaReq
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: cache_size
  FLAG: NeedSchema Result0 SchemaReq NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: mmap_size
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: auto_vacuum
  FLAG: NeedSchema Result0 SchemaReq NoColumns1
  IF:   !defined(SQLITE_OMIT_AUTOVACUUM)

  NAME: incremental_vacuum
  FLAG: NeedSchema NoColumns
  IF:   !defined(SQLITE_OMIT_AUTOVACUUM)

  NAME: temp_store
  FLAG: Result0 NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: temp_store_directory
  FLAG: NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: data_store_directory
  FLAG: NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS) && SQLITE_OS_WIN

  NAME: lock_proxy_file
  FLAG: NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS) && SQLITE_ENABLE_LOCKING_STYLE

  NAME: synchronous
  FLAG: NeedSchema Result0 SchemaReq NoColumns1
  IF:   !defined(SQLITE_OMIT_PAGER_PRAGMAS)

  NAME: table_info
  FLAG: NeedSchema Result1 SchemaOpt
  ARG:  0
  COLS: cid name type notnull dflt_value pk
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: table_xinfo
  TYPE: TABLE_INFO
  FLAG: NeedSchema Result1 SchemaOpt
  ARG:  1
  COLS: cid name type notnull dflt_value pk hidden
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: stats
  FLAG: NeedSchema Result0 SchemaReq
  COLS: tbl idx wdth hght flgs
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS) && defined(SQLITE_DEBUG)

  NAME: index_info
  TYPE: INDEX_INFO
  ARG:  0
  FLAG: NeedSchema Result1 SchemaOpt
  COLS: seqno cid name
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: index_xinfo
  TYPE: INDEX_INFO
  ARG:  1
  FLAG: NeedSchema Result1 SchemaOpt
  COLS: seqno cid name desc coll key
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: index_list
  FLAG: NeedSchema Result1 SchemaOpt
  COLS: seq name unique origin partial
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: database_list
  FLAG: NeedSchema Result0
  COLS: seq name file
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: function_list
  FLAG: Result0
  COLS: name builtin type enc narg flags
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)
  IF:   !defined(SQLITE_OMIT_INTROSPECTION_PRAGMAS)

  NAME: module_list
  FLAG: Result0
  COLS: name
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)
  IF:   !defined(SQLITE_OMIT_VIRTUALTABLE)
  IF:   !defined(SQLITE_OMIT_INTROSPECTION_PRAGMAS)

  NAME: pragma_list
  FLAG: Result0
  COLS: name
  IF:   !defined(SQLITE_OMIT_INTROSPECTION_PRAGMAS)

  NAME: collation_list
  FLAG: Result0
  COLS: seq name
  IF:   !defined(SQLITE_OMIT_SCHEMA_PRAGMAS)

  NAME: foreign_key_list
  FLAG: NeedSchema Result1 SchemaOpt
  COLS: id seq table from to on_update on_delete match
  IF:   !defined(SQLITE_OMIT_FOREIGN_KEY)

  NAME: foreign_key_check
  FLAG: NeedSchema Result0 Result1 SchemaOpt
  COLS: table rowid parent fkid
  IF:   !defined(SQLITE_OMIT_FOREIGN_KEY) && !defined(SQLITE_OMIT_TRIGGER)

  NAME: parser_trace
  TYPE: FLAG
  ARG:  SQLITE_ParserTrace
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
  IF:   defined(SQLITE_DEBUG)

  NAME: case_sensitive_like
  FLAG: NoColumns
  IF:   !defined(SQLITE_OMIT_CASE_SENSITIVE_LIKE_PRAGMA)

  NAME: integrity_check
  FLAG: NeedSchema Result0 Result1
  IF:   !defined(SQLITE_OMIT_INTEGRITY_CHECK)

  NAME: quick_check
  TYPE: INTEGRITY_CHECK
  FLAG: NeedSchema Result0 Result1
  IF:   !defined(SQLITE_OMIT_INTEGRITY_CHECK)

  NAME: encoding
  FLAG: Result0 NoColumns1
  IF:   !defined(SQLITE_OMIT_UTF16)

  NAME: schema_version
  TYPE: HEADER_VALUE
  ARG:  BTREE_SCHEMA_VERSION
  FLAG: NoColumns1 Result0
  IF:   !defined(SQLITE_OMIT_SCHEMA_VERSION_PRAGMAS)

  NAME: user_version
  TYPE: HEADER_VALUE
  ARG:  BTREE_USER_VERSION
  FLAG: NoColumns1 Result0
  IF:   !defined(SQLITE_OMIT_SCHEMA_VERSION_PRAGMAS)

  NAME: data_version
  TYPE: HEADER_VALUE
  ARG:  BTREE_DATA_VERSION
  FLAG: ReadOnly Result0
  IF:   !defined(SQLITE_OMIT_SCHEMA_VERSION_PRAGMAS)

  NAME: freelist_count
  TYPE: HEADER_VALUE
  ARG:  BTREE_FREE_PAGE_COUNT
  FLAG: ReadOnly Result0
  IF:   !defined(SQLITE_OMIT_SCHEMA_VERSION_PRAGMAS)

  NAME: application_id
  TYPE: HEADER_VALUE
  ARG:  BTREE_APPLICATION_ID
  FLAG: NoColumns1 Result0
  IF:   !defined(SQLITE_OMIT_SCHEMA_VERSION_PRAGMAS)

  NAME: compile_options
  FLAG: Result0
  IF:   !defined(SQLITE_OMIT_COMPILEOPTION_DIAGS)

  NAME: wal_checkpoint
  FLAG: NeedSchema
  COLS: busy log checkpointed
  IF:   !defined(SQLITE_OMIT_WAL)

  NAME: wal_autocheckpoint
  IF:   !defined(SQLITE_OMIT_WAL)

  NAME: shrink_memory
  FLAG: NoColumns

  NAME: busy_timeout
  FLAG: Result0
  COLS: timeout

  NAME: lock_status
  FLAG: Result0
  COLS: database status
  IF:   defined(SQLITE_DEBUG) || defined(SQLITE_TEST)

  NAME: activate_extensions
  IF:   defined(SQLITE_ENABLE_CEROD)

  NAME: soft_heap_limit
  FLAG: Result0

  NAME: hard_heap_limit
  FLAG: Result0

  NAME: threads
  FLAG: Result0

  NAME: analysis_limit
  FLAG: Result0

  NAME: optimize
  FLAG: Result1 NeedSchema

  NAME: legacy_alter_table
  TYPE: FLAG
  ARG:  SQLITE_LegacyAlter
  IF:   !defined(SQLITE_OMIT_FLAG_PRAGMAS)
}

# Open the output file
#
set destfile "[file dir [file dir [file normal $argv0]]]/src/pragma.h"
puts "Overwriting $destfile with new pragma table..."
set fd [open $destfile wb]
puts $fd {/* DO NOT EDIT!
** This file is automatically generated by the script at
** ../tool/mkpragmatab.tcl.  To update the set of pragmas, edit
** that script and rerun it.
*/}

# Parse the PRAGMA table above.
#
set name {}
set type {}
set if {}
set flags {}
set cols {}
set cols_list {}
set arg 0
proc record_one {} {
  global name type if arg allbyname typebyif flags cols all_cols
  global cols_list colUsedBy
  if {$name==""} return
  if {$cols!=""} {
    if {![info exists all_cols($cols)]} {
      set all_cols($cols) 1
      lappend cols_list $cols
    }
    set cx $cols
    lappend colUsedBy($cols) $name
  } else {
    set cx 0
  }
  set allbyname($name) [list $type $arg $if $flags $cols]
  set name {}
  set type {}
  set if {}
  set flags {}
  set cols {}
  set arg 0
}
foreach line [split $pragma_def \n] {
  set line [string trim $line]
  if {$line==""} continue
  foreach {id val} [split $line :] break
  set val [string trim $val]
  if {$id=="NAME"} {
    record_one    
    set name $val
    set type [string toupper $val]
  } elseif {$id=="TYPE"} {
    set type $val
    if {$type=="FLAG"} {
      lappend flags Result0 NoColumns1
    }
  } elseif {$id=="ARG"} {
    set arg $val
  } elseif {$id=="COLS"} {
    set cols $val
  } elseif {$id=="IF"} {
    lappend if $val
  } elseif {$id=="FLAG"} {
    foreach term [split $val] {
      lappend flags $term
      set allflags($term) 1
    }
  } else {
    error "bad pragma_def line: $line"
  }
}
record_one
set allnames [lsort [array names allbyname]]

# Generate #defines for all pragma type names.  Group the pragmas that are
# omit in default builds (ex: defined(SQLITE_DEBUG))
# at the end.
#
puts $fd "\n/* The various pragma types */"
set pnum 0
foreach name $allnames {
  set type [lindex $allbyname($name) 0]
  if {[info exists seentype($type)]} continue
  set if [lindex $allbyname($name) 2]
  if {[regexp SQLITE_DEBUG $if] || [regexp SQLITE_HAS_CODEC $if]} continue
  set seentype($type) 1
  puts $fd [format {#define %-35s %4d} PragTyp_$type $pnum]
  incr pnum
}
foreach name $allnames {
  set type [lindex $allbyname($name) 0]
  if {[info exists seentype($type)]} continue
  set if [lindex $allbyname($name) 2]
  if {[regexp SQLITE_DEBUG $if]} continue
  set seentype($type) 1
  puts $fd [format {#define %-35s %4d} PragTyp_$type $pnum]
  incr pnum
}
foreach name $allnames {
  set type [lindex $allbyname($name) 0]
  if {[info exists seentype($type)]} continue
  set seentype($type) 1
  puts $fd [format {#define %-35s %4d} PragTyp_$type $pnum]
  incr pnum
}

# Generate #defines for flags
#
puts $fd "\n/* Property flags associated with various pragma. */"
set fv 1
foreach f [lsort [array names allflags]] {
  puts $fd [format {#define PragFlg_%-10s 0x%02x /* %s */} \
             $f $fv $flagMeaning($f)]
  set fv [expr {$fv*2}]
}

# Sort the column lists so that longer column lists occur first
#
proc colscmp {a b} {
  return [expr {[llength $b] - [llength $a]}]
}
set cols_list [lsort -command colscmp $cols_list]

# Generate the array of column names used by pragmas that act like
# queries.
#
puts $fd "\n/* Names of columns for pragmas that return multi-column result"
puts $fd "** or that return single-column results where the name of the"
puts $fd "** result column is different from the name of the pragma\n*/"
puts $fd "static const char *const pragCName\[\] = {"
set offset 0
set allcollist {}
foreach cols $cols_list {
  set n [llength $cols]
  set limit [expr {[llength $allcollist] - $n}]
  for {set i 0} {$i<$limit} {incr i} {
    set sublist [lrange $allcollist $i [expr {$i+$n-1}]]
    if {$sublist==$cols} {
      puts $fd [format "%27s/* $colUsedBy($cols) reuses $i */" ""]
      set cols_offset($cols) $i
      break
    }
  }
  if {$i<$limit} continue
  set cols_offset($cols) $offset
  set ub " /* Used by: $colUsedBy($cols) */"
  foreach c $cols {
    lappend allcollist $c
    puts $fd [format "  /* %3d */ %-14s%s" $offset \"$c\", $ub]
    set ub ""
    incr offset
  }
}
puts $fd "\175;"

# Generate the lookup table
#
puts $fd "\n/* Definitions of all built-in pragmas */"
puts $fd "typedef struct PragmaName \173"
puts $fd "  const char *const zName; /* Name of pragma */"
puts $fd "  u8 ePragTyp;             /* PragTyp_XXX value */"
puts $fd "  u8 mPragFlg;             /* Zero or more PragFlg_XXX values */"
puts $fd {  u8 iPragCName;           /* Start of column names in pragCName[] */}
puts $fd "  u8 nPragCName;          \
/* Num of col names. 0 means use pragma name */"
puts $fd "  u64 iArg;                /* Extra argument */"
puts $fd "\175 PragmaName;"
puts $fd "static const PragmaName aPragmaName\[\] = \173"

set current_if {}
set spacer [format {    %26s } {}]
foreach name $allnames {
  foreach {type arg if flag cx} $allbyname($name) break
  if {$cx==0 || $cx==""} {
    set cy 0
    set nx 0
  } else {
    set cy $cols_offset($cx)
    set nx [llength $cx]
  }
  if {$if!=$current_if} {
    if {$current_if!=""} {
      foreach this_if $current_if {
        puts $fd "#endif"
      }
    }
    set current_if $if
    if {$current_if!=""} {
      foreach this_if $current_if {
        puts $fd "#if $this_if"
      }
    }
  }
  set typex [format PragTyp_%-23s $type,]
  if {$flag==""} {
    set flagx "0"
  } else {
    set flagx PragFlg_[join $flag {|PragFlg_}]
  }
  puts $fd " \173/* zName:     */ \"$name\","
  puts $fd "  /* ePragTyp:  */ PragTyp_$type,"
  puts $fd "  /* ePragFlg:  */ $flagx,"
  puts $fd "  /* ColNames:  */ $cy, $nx,"
  puts $fd "  /* iArg:      */ $arg \175,"
}
if {$current_if!=""} {
  foreach this_if $current_if {
    puts $fd "#endif"
  }
}
puts $fd "\175;"

# count the number of pragmas, for information purposes
#
set allcnt 0
set dfltcnt 0
foreach name $allnames {
  incr allcnt
  set if [lindex $allbyname($name) 2]
  if {[regexp {^defined} $if] || [regexp {[^!]defined} $if]} continue
  incr dfltcnt
}
puts $fd "/* Number of pragmas: $dfltcnt on by default, $allcnt total. */"
