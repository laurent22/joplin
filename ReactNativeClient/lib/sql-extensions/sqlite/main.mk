###############################################################################
# The following macros should be defined before this script is
# invoked:
#
# TOP              The toplevel directory of the source tree.  This is the
#                  directory that contains this "Makefile.in" and the
#                  "configure.in" script.
#
# BCC              C Compiler and options for use in building executables that
#                  will run on the platform that is doing the build.
#
# THREADLIB        Specify any extra linker options needed to make the library
#                  thread safe
#
# LIBS             Extra libraries options
#
# OPTS             Extra compiler command-line options.
#
# EXE              The suffix to add to executable files.  ".exe" for windows
#                  and "" for Unix.
#
# TCC              C Compiler and options for use in building executables that
#                  will run on the target platform.  This is usually the same
#                  as BCC, unless you are cross-compiling.
#
# AR               Tools used to build a static library.
# RANLIB
#
# TCL_FLAGS        Extra compiler options needed for programs that use the
#                  TCL library.
#
# LIBTCL           Linker options needed to link against the TCL library.
#
# READLINE_FLAGS   Compiler options needed for programs that use the
#                  readline() library.
#
# LIBREADLINE      Linker options needed by programs using readline() must
#                  link against.
#
# Once the macros above are defined, the rest of this make script will
# build the SQLite library and testing tools.
################################################################################

# This is how we compile
#
TCCX =  $(TCC) $(OPTS) -I. -I$(TOP)/src -I$(TOP)
TCCX += -I$(TOP)/ext/rtree -I$(TOP)/ext/icu -I$(TOP)/ext/fts3
TCCX += -I$(TOP)/ext/async -I$(TOP)/ext/userauth
TCCX += -I$(TOP)/ext/session
TCCX += -I$(TOP)/ext/fts5
THREADLIB += $(LIBS)

# Object files for the SQLite library.
#
LIBOBJ+= vdbe.o parse.o \
         alter.o analyze.o attach.o auth.o \
         backup.o bitvec.o btmutex.o btree.o build.o \
         callback.o complete.o ctime.o \
         date.o dbpage.o dbstat.o delete.o expr.o \
	 fault.o fkey.o \
         fts3.o fts3_aux.o fts3_expr.o fts3_hash.o fts3_icu.o fts3_porter.o \
         fts3_snippet.o fts3_tokenizer.o fts3_tokenizer1.o \
         fts3_tokenize_vtab.o \
	 fts3_unicode.o fts3_unicode2.o \
         fts3_write.o fts5.o func.o global.o hash.o \
         icu.o insert.o json1.o legacy.o loadext.o \
         main.o malloc.o mem0.o mem1.o mem2.o mem3.o mem5.o \
         memdb.o memjournal.o \
         mutex.o mutex_noop.o mutex_unix.o mutex_w32.o \
         notify.o opcodes.o os.o os_unix.o os_win.o \
         pager.o pcache.o pcache1.o pragma.o prepare.o printf.o \
         random.o resolve.o rowset.o rtree.o \
         select.o sqlite3rbu.o status.o stmt.o \
         table.o threads.o tokenize.o treeview.o trigger.o \
         update.o upsert.o userauth.o util.o vacuum.o \
         vdbeapi.o vdbeaux.o vdbeblob.o vdbemem.o vdbesort.o \
	 vdbetrace.o vdbevtab.o \
         wal.o walker.o where.o wherecode.o whereexpr.o \
         utf.o vtab.o window.o

LIBOBJ += sqlite3session.o

# All of the source code files.
#
SRC = \
  $(TOP)/src/alter.c \
  $(TOP)/src/analyze.c \
  $(TOP)/src/attach.c \
  $(TOP)/src/auth.c \
  $(TOP)/src/backup.c \
  $(TOP)/src/bitvec.c \
  $(TOP)/src/btmutex.c \
  $(TOP)/src/btree.c \
  $(TOP)/src/btree.h \
  $(TOP)/src/btreeInt.h \
  $(TOP)/src/build.c \
  $(TOP)/src/callback.c \
  $(TOP)/src/complete.c \
  $(TOP)/src/ctime.c \
  $(TOP)/src/date.c \
  $(TOP)/src/dbpage.c \
  $(TOP)/src/dbstat.c \
  $(TOP)/src/delete.c \
  $(TOP)/src/expr.c \
  $(TOP)/src/fault.c \
  $(TOP)/src/fkey.c \
  $(TOP)/src/func.c \
  $(TOP)/src/global.c \
  $(TOP)/src/hash.c \
  $(TOP)/src/hash.h \
  $(TOP)/src/hwtime.h \
  $(TOP)/src/insert.c \
  $(TOP)/src/legacy.c \
  $(TOP)/src/loadext.c \
  $(TOP)/src/main.c \
  $(TOP)/src/malloc.c \
  $(TOP)/src/mem0.c \
  $(TOP)/src/mem1.c \
  $(TOP)/src/mem2.c \
  $(TOP)/src/mem3.c \
  $(TOP)/src/mem5.c \
  $(TOP)/src/memdb.c \
  $(TOP)/src/memjournal.c \
  $(TOP)/src/msvc.h \
  $(TOP)/src/mutex.c \
  $(TOP)/src/mutex.h \
  $(TOP)/src/mutex_noop.c \
  $(TOP)/src/mutex_unix.c \
  $(TOP)/src/mutex_w32.c \
  $(TOP)/src/notify.c \
  $(TOP)/src/os.c \
  $(TOP)/src/os.h \
  $(TOP)/src/os_common.h \
  $(TOP)/src/os_setup.h \
  $(TOP)/src/os_unix.c \
  $(TOP)/src/os_win.c \
  $(TOP)/src/os_win.h \
  $(TOP)/src/pager.c \
  $(TOP)/src/pager.h \
  $(TOP)/src/parse.y \
  $(TOP)/src/pcache.c \
  $(TOP)/src/pcache.h \
  $(TOP)/src/pcache1.c \
  $(TOP)/src/pragma.c \
  $(TOP)/src/pragma.h \
  $(TOP)/src/prepare.c \
  $(TOP)/src/printf.c \
  $(TOP)/src/random.c \
  $(TOP)/src/resolve.c \
  $(TOP)/src/rowset.c \
  $(TOP)/src/select.c \
  $(TOP)/src/status.c \
  $(TOP)/src/shell.c.in \
  $(TOP)/src/sqlite.h.in \
  $(TOP)/src/sqlite3ext.h \
  $(TOP)/src/sqliteInt.h \
  $(TOP)/src/sqliteLimit.h \
  $(TOP)/src/table.c \
  $(TOP)/src/tclsqlite.c \
  $(TOP)/src/threads.c \
  $(TOP)/src/tokenize.c \
  $(TOP)/src/treeview.c \
  $(TOP)/src/trigger.c \
  $(TOP)/src/utf.c \
  $(TOP)/src/update.c \
  $(TOP)/src/upsert.c \
  $(TOP)/src/util.c \
  $(TOP)/src/vacuum.c \
  $(TOP)/src/vdbe.c \
  $(TOP)/src/vdbe.h \
  $(TOP)/src/vdbeapi.c \
  $(TOP)/src/vdbeaux.c \
  $(TOP)/src/vdbeblob.c \
  $(TOP)/src/vdbemem.c \
  $(TOP)/src/vdbesort.c \
  $(TOP)/src/vdbetrace.c \
  $(TOP)/src/vdbevtab.c \
  $(TOP)/src/vdbeInt.h \
  $(TOP)/src/vtab.c \
  $(TOP)/src/vxworks.h \
  $(TOP)/src/wal.c \
  $(TOP)/src/wal.h \
  $(TOP)/src/walker.c \
  $(TOP)/src/where.c \
  $(TOP)/src/wherecode.c \
  $(TOP)/src/whereexpr.c \
  $(TOP)/src/whereInt.h \
  $(TOP)/src/window.c

# Source code for extensions
#
SRC += \
  $(TOP)/ext/fts1/fts1.c \
  $(TOP)/ext/fts1/fts1.h \
  $(TOP)/ext/fts1/fts1_hash.c \
  $(TOP)/ext/fts1/fts1_hash.h \
  $(TOP)/ext/fts1/fts1_porter.c \
  $(TOP)/ext/fts1/fts1_tokenizer.h \
  $(TOP)/ext/fts1/fts1_tokenizer1.c
SRC += \
  $(TOP)/ext/fts2/fts2.c \
  $(TOP)/ext/fts2/fts2.h \
  $(TOP)/ext/fts2/fts2_hash.c \
  $(TOP)/ext/fts2/fts2_hash.h \
  $(TOP)/ext/fts2/fts2_icu.c \
  $(TOP)/ext/fts2/fts2_porter.c \
  $(TOP)/ext/fts2/fts2_tokenizer.h \
  $(TOP)/ext/fts2/fts2_tokenizer.c \
  $(TOP)/ext/fts2/fts2_tokenizer1.c
SRC += \
  $(TOP)/ext/fts3/fts3.c \
  $(TOP)/ext/fts3/fts3.h \
  $(TOP)/ext/fts3/fts3Int.h \
  $(TOP)/ext/fts3/fts3_aux.c \
  $(TOP)/ext/fts3/fts3_expr.c \
  $(TOP)/ext/fts3/fts3_hash.c \
  $(TOP)/ext/fts3/fts3_hash.h \
  $(TOP)/ext/fts3/fts3_icu.c \
  $(TOP)/ext/fts3/fts3_porter.c \
  $(TOP)/ext/fts3/fts3_snippet.c \
  $(TOP)/ext/fts3/fts3_tokenizer.h \
  $(TOP)/ext/fts3/fts3_tokenizer.c \
  $(TOP)/ext/fts3/fts3_tokenizer1.c \
  $(TOP)/ext/fts3/fts3_tokenize_vtab.c \
  $(TOP)/ext/fts3/fts3_unicode.c \
  $(TOP)/ext/fts3/fts3_unicode2.c \
  $(TOP)/ext/fts3/fts3_write.c
SRC += \
  $(TOP)/ext/icu/sqliteicu.h \
  $(TOP)/ext/icu/icu.c
SRC += \
  $(TOP)/ext/rtree/sqlite3rtree.h \
  $(TOP)/ext/rtree/rtree.h \
  $(TOP)/ext/rtree/rtree.c \
  $(TOP)/ext/rtree/geopoly.c
SRC += \
  $(TOP)/ext/session/sqlite3session.c \
  $(TOP)/ext/session/sqlite3session.h
SRC += \
  $(TOP)/ext/userauth/userauth.c \
  $(TOP)/ext/userauth/sqlite3userauth.h
SRC += \
  $(TOP)/ext/rbu/sqlite3rbu.c \
  $(TOP)/ext/rbu/sqlite3rbu.h
SRC += \
  $(TOP)/ext/misc/json1.c \
  $(TOP)/ext/misc/stmt.c


# FTS5 things
#
FTS5_HDR = \
   $(TOP)/ext/fts5/fts5.h \
   $(TOP)/ext/fts5/fts5Int.h \
   fts5parse.h

FTS5_SRC = \
   $(TOP)/ext/fts5/fts5_aux.c \
   $(TOP)/ext/fts5/fts5_buffer.c \
   $(TOP)/ext/fts5/fts5_main.c \
   $(TOP)/ext/fts5/fts5_config.c \
   $(TOP)/ext/fts5/fts5_expr.c \
   $(TOP)/ext/fts5/fts5_hash.c \
   $(TOP)/ext/fts5/fts5_index.c \
   fts5parse.c \
   $(TOP)/ext/fts5/fts5_storage.c \
   $(TOP)/ext/fts5/fts5_tokenize.c \
   $(TOP)/ext/fts5/fts5_unicode2.c \
   $(TOP)/ext/fts5/fts5_varint.c \
   $(TOP)/ext/fts5/fts5_vocab.c  \

LSM1_SRC = \
   $(TOP)/ext/lsm1/lsm.h \
   $(TOP)/ext/lsm1/lsmInt.h \
   $(TOP)/ext/lsm1/lsm_ckpt.c \
   $(TOP)/ext/lsm1/lsm_file.c \
   $(TOP)/ext/lsm1/lsm_log.c \
   $(TOP)/ext/lsm1/lsm_main.c \
   $(TOP)/ext/lsm1/lsm_mem.c \
   $(TOP)/ext/lsm1/lsm_mutex.c \
   $(TOP)/ext/lsm1/lsm_shared.c \
   $(TOP)/ext/lsm1/lsm_sorted.c \
   $(TOP)/ext/lsm1/lsm_str.c \
   $(TOP)/ext/lsm1/lsm_tree.c \
   $(TOP)/ext/lsm1/lsm_unix.c \
   $(TOP)/ext/lsm1/lsm_varint.c \
   $(TOP)/ext/lsm1/lsm_vtab.c \
   $(TOP)/ext/lsm1/lsm_win32.c


# Generated source code files
#
SRC += \
  keywordhash.h \
  opcodes.c \
  opcodes.h \
  parse.c \
  parse.h \
  shell.c \
  sqlite3.h


# Source code to the test files.
#
TESTSRC = \
  $(TOP)/ext/expert/sqlite3expert.c \
  $(TOP)/ext/expert/test_expert.c \
  $(TOP)/ext/fts3/fts3_term.c \
  $(TOP)/ext/fts3/fts3_test.c \
  $(TOP)/ext/rbu/test_rbu.c \
  $(TOP)/src/test1.c \
  $(TOP)/src/test2.c \
  $(TOP)/src/test3.c \
  $(TOP)/src/test4.c \
  $(TOP)/src/test5.c \
  $(TOP)/src/test6.c \
  $(TOP)/src/test7.c \
  $(TOP)/src/test8.c \
  $(TOP)/src/test9.c \
  $(TOP)/src/test_autoext.c \
  $(TOP)/src/test_async.c \
  $(TOP)/src/test_backup.c \
  $(TOP)/src/test_bestindex.c \
  $(TOP)/src/test_blob.c \
  $(TOP)/src/test_btree.c \
  $(TOP)/src/test_config.c \
  $(TOP)/src/test_delete.c \
  $(TOP)/src/test_demovfs.c \
  $(TOP)/src/test_devsym.c \
  $(TOP)/src/test_fs.c \
  $(TOP)/src/test_func.c \
  $(TOP)/src/test_hexio.c \
  $(TOP)/src/test_init.c \
  $(TOP)/src/test_intarray.c \
  $(TOP)/src/test_journal.c \
  $(TOP)/src/test_malloc.c \
  $(TOP)/src/test_md5.c \
  $(TOP)/src/test_multiplex.c \
  $(TOP)/src/test_mutex.c \
  $(TOP)/src/test_onefile.c \
  $(TOP)/src/test_osinst.c \
  $(TOP)/src/test_pcache.c \
  $(TOP)/src/test_quota.c \
  $(TOP)/src/test_rtree.c \
  $(TOP)/src/test_schema.c \
  $(TOP)/src/test_server.c \
  $(TOP)/src/test_sqllog.c \
  $(TOP)/src/test_superlock.c \
  $(TOP)/src/test_syscall.c \
  $(TOP)/src/test_tclsh.c \
  $(TOP)/src/test_tclvar.c \
  $(TOP)/src/test_thread.c \
  $(TOP)/src/test_vdbecov.c \
  $(TOP)/src/test_vfs.c \
  $(TOP)/src/test_windirent.c \
  $(TOP)/src/test_window.c \
  $(TOP)/src/test_wsd.c

# Extensions to be statically loaded.
#
TESTSRC += \
  $(TOP)/ext/misc/amatch.c \
  $(TOP)/ext/misc/carray.c \
  $(TOP)/ext/misc/closure.c \
  $(TOP)/ext/misc/csv.c \
  $(TOP)/ext/misc/decimal.c \
  $(TOP)/ext/misc/eval.c \
  $(TOP)/ext/misc/explain.c \
  $(TOP)/ext/misc/fileio.c \
  $(TOP)/ext/misc/fuzzer.c \
  $(TOP)/ext/misc/ieee754.c \
  $(TOP)/ext/misc/mmapwarm.c \
  $(TOP)/ext/misc/nextchar.c \
  $(TOP)/ext/misc/normalize.c \
  $(TOP)/ext/misc/percentile.c \
  $(TOP)/ext/misc/prefixes.c \
  $(TOP)/ext/misc/regexp.c \
  $(TOP)/ext/misc/remember.c \
  $(TOP)/ext/misc/series.c \
  $(TOP)/ext/misc/spellfix.c \
  $(TOP)/ext/misc/totype.c \
  $(TOP)/ext/misc/unionvtab.c \
  $(TOP)/ext/misc/wholenumber.c \
  $(TOP)/ext/misc/zipfile.c \
  $(TOP)/ext/fts5/fts5_tcl.c \
  $(TOP)/ext/fts5/fts5_test_mi.c \
  $(TOP)/ext/fts5/fts5_test_tok.c


#TESTSRC += $(TOP)/ext/fts2/fts2_tokenizer.c
#TESTSRC += $(TOP)/ext/fts3/fts3_tokenizer.c

TESTSRC2 = \
  $(TOP)/src/attach.c \
  $(TOP)/src/backup.c \
  $(TOP)/src/btree.c \
  $(TOP)/src/build.c \
  $(TOP)/src/date.c \
  $(TOP)/src/dbpage.c \
  $(TOP)/src/dbstat.c \
  $(TOP)/src/expr.c \
  $(TOP)/src/func.c \
  $(TOP)/src/global.c \
  $(TOP)/src/insert.c \
  $(TOP)/src/wal.c \
  $(TOP)/src/main.c \
  $(TOP)/src/mem5.c \
  $(TOP)/src/os.c \
  $(TOP)/src/os_unix.c \
  $(TOP)/src/os_win.c \
  $(TOP)/src/pager.c \
  $(TOP)/src/pragma.c \
  $(TOP)/src/prepare.c \
  $(TOP)/src/printf.c \
  $(TOP)/src/random.c \
  $(TOP)/src/pcache.c \
  $(TOP)/src/pcache1.c \
  $(TOP)/src/select.c \
  $(TOP)/src/threads.c \
  $(TOP)/src/tokenize.c \
  $(TOP)/src/utf.c \
  $(TOP)/src/util.c \
  $(TOP)/src/vdbeapi.c \
  $(TOP)/src/vdbeaux.c \
  $(TOP)/src/vdbe.c \
  $(TOP)/src/vdbemem.c \
  $(TOP)/src/vdbevtab.c \
  $(TOP)/src/where.c \
  $(TOP)/src/wherecode.c \
  $(TOP)/src/whereexpr.c \
  parse.c \
  $(TOP)/ext/fts3/fts3.c \
  $(TOP)/ext/fts3/fts3_aux.c \
  $(TOP)/ext/fts3/fts3_expr.c \
  $(TOP)/ext/fts3/fts3_tokenizer.c \
  $(TOP)/ext/fts3/fts3_write.c \
  $(TOP)/ext/async/sqlite3async.c \
  $(TOP)/ext/misc/stmt.c \
  $(TOP)/ext/session/sqlite3session.c \
  $(TOP)/ext/session/test_session.c

# Header files used by all library source files.
#
HDR = \
   $(TOP)/src/btree.h \
   $(TOP)/src/btreeInt.h \
   $(TOP)/src/hash.h \
   $(TOP)/src/hwtime.h \
   keywordhash.h \
   $(TOP)/src/msvc.h \
   $(TOP)/src/mutex.h \
   opcodes.h \
   $(TOP)/src/os.h \
   $(TOP)/src/os_common.h \
   $(TOP)/src/os_setup.h \
   $(TOP)/src/os_win.h \
   $(TOP)/src/pager.h \
   $(TOP)/src/pcache.h \
   parse.h  \
   $(TOP)/src/pragma.h \
   sqlite3.h  \
   $(TOP)/src/sqlite3ext.h \
   $(TOP)/src/sqliteInt.h  \
   $(TOP)/src/sqliteLimit.h \
   $(TOP)/src/vdbe.h \
   $(TOP)/src/vdbeInt.h \
   $(TOP)/src/vxworks.h \
   $(TOP)/src/whereInt.h

# Header files used by extensions
#
EXTHDR += \
  $(TOP)/ext/fts1/fts1.h \
  $(TOP)/ext/fts1/fts1_hash.h \
  $(TOP)/ext/fts1/fts1_tokenizer.h
EXTHDR += \
  $(TOP)/ext/fts2/fts2.h \
  $(TOP)/ext/fts2/fts2_hash.h \
  $(TOP)/ext/fts2/fts2_tokenizer.h
EXTHDR += \
  $(TOP)/ext/fts3/fts3.h \
  $(TOP)/ext/fts3/fts3Int.h \
  $(TOP)/ext/fts3/fts3_hash.h \
  $(TOP)/ext/fts3/fts3_tokenizer.h
EXTHDR += \
  $(TOP)/ext/rtree/rtree.h \
  $(TOP)/ext/rtree/geopoly.c
EXTHDR += \
  $(TOP)/ext/icu/sqliteicu.h
EXTHDR += \
  $(TOP)/ext/fts5/fts5Int.h  \
  fts5parse.h                \
  $(TOP)/ext/fts5/fts5.h
EXTHDR += \
  $(TOP)/ext/userauth/sqlite3userauth.h

# executables needed for testing
#
TESTPROGS = \
  testfixture$(EXE) \
  sqlite3$(EXE) \
  sqlite3_analyzer$(EXE) \
  sqlite3_checker$(EXE) \
  sqldiff$(EXE) \
  dbhash$(EXE) \
  sqltclsh$(EXE)

# Databases containing fuzzer test cases
#
FUZZDATA = \
  $(TOP)/test/fuzzdata1.db \
  $(TOP)/test/fuzzdata2.db \
  $(TOP)/test/fuzzdata3.db \
  $(TOP)/test/fuzzdata4.db \
  $(TOP)/test/fuzzdata5.db \
  $(TOP)/test/fuzzdata6.db \
  $(TOP)/test/fuzzdata7.db \
  $(TOP)/test/fuzzdata8.db

# Standard options to testfixture
#
TESTOPTS = --verbose=file --output=test-out.txt

# Extra compiler options for various shell tools
#
SHELL_OPT += -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_FTS4 -DSQLITE_ENABLE_FTS5
SHELL_OPT += -DSQLITE_ENABLE_RTREE
SHELL_OPT += -DSQLITE_ENABLE_EXPLAIN_COMMENTS
SHELL_OPT += -DSQLITE_ENABLE_UNKNOWN_SQL_FUNCTION
SHELL_OPT += -DSQLITE_ENABLE_STMTVTAB
SHELL_OPT += -DSQLITE_ENABLE_DBPAGE_VTAB
SHELL_OPT += -DSQLITE_ENABLE_DBSTAT_VTAB
SHELL_OPT += -DSQLITE_ENABLE_BYTECODE_VTAB
SHELL_OPT += -DSQLITE_ENABLE_OFFSET_SQL_FUNC
FUZZERSHELL_OPT = -DSQLITE_ENABLE_JSON1
FUZZCHECK_OPT = -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_MEMSYS5
FUZZCHECK_OPT += -DSQLITE_MAX_MEMORY=50000000
FUZZCHECK_OPT += -DSQLITE_PRINTF_PRECISION_LIMIT=1000
FUZZCHECK_OPT += -DSQLITE_ENABLE_DESERIALIZE
FUZZCHECK_OPT += -DSQLITE_ENABLE_FTS4
FUZZCHECK_OPT += -DSQLITE_ENABLE_RTREE
FUZZCHECK_OPT += -DSQLITE_ENABLE_GEOPOLY
FUZZCHECK_OPT += -DSQLITE_ENABLE_DBSTAT_VTAB
FUZZCHECK_OPT += -DSQLITE_ENABLE_BYTECODE_VTAB
DBFUZZ_OPT =
KV_OPT = -DSQLITE_THREADSAFE=0 -DSQLITE_DIRECT_OVERFLOW_READ
ST_OPT = -DSQLITE_THREADSAFE=0

# This is the default Makefile target.  The objects listed here
# are what get build when you type just "make" with no arguments.
#
all:	sqlite3.h libsqlite3.a sqlite3$(EXE)

libsqlite3.a:	$(LIBOBJ)
	$(AR) libsqlite3.a $(LIBOBJ)
	$(RANLIB) libsqlite3.a

sqlite3$(EXE):	shell.c libsqlite3.a sqlite3.h
	$(TCCX) $(READLINE_FLAGS) -o sqlite3$(EXE) $(SHELL_OPT) \
		shell.c libsqlite3.a $(LIBREADLINE) $(TLIBS) $(THREADLIB)

sqldiff$(EXE):	$(TOP)/tool/sqldiff.c sqlite3.c sqlite3.h
	$(TCCX) -o sqldiff$(EXE) -DSQLITE_THREADSAFE=0 \
		$(TOP)/tool/sqldiff.c sqlite3.c $(TLIBS) $(THREADLIB)

dbhash$(EXE):	$(TOP)/tool/dbhash.c sqlite3.c sqlite3.h
	$(TCCX) -o dbhash$(EXE) -DSQLITE_THREADSAFE=0 \
		$(TOP)/tool/dbhash.c sqlite3.c $(TLIBS) $(THREADLIB)

scrub$(EXE):	$(TOP)/ext/misc/scrub.c sqlite3.o
	$(TCC) -I. -DSCRUB_STANDALONE -o scrub$(EXE) $(TOP)/ext/misc/scrub.c sqlite3.o $(THREADLIB)

srcck1$(EXE):	$(TOP)/tool/srcck1.c
	$(BCC) -o srcck1$(EXE) $(TOP)/tool/srcck1.c

sourcetest:	srcck1$(EXE) sqlite3.c
	./srcck1 sqlite3.c

fuzzershell$(EXE):	$(TOP)/tool/fuzzershell.c sqlite3.c sqlite3.h
	$(TCCX) -o fuzzershell$(EXE) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION \
	  $(FUZZERSHELL_OPT) $(TOP)/tool/fuzzershell.c sqlite3.c \
	  $(TLIBS) $(THREADLIB)

dbfuzz$(EXE):	$(TOP)/test/dbfuzz.c sqlite3.c sqlite3.h
	$(TCCX) -o dbfuzz$(EXE) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION \
	  $(DBFUZZ_OPT) $(TOP)/test/dbfuzz.c sqlite3.c \
	  $(TLIBS) $(THREADLIB)

DBFUZZ2_OPTS = \
  -DSQLITE_THREADSAFE=0 \
  -DSQLITE_OMIT_LOAD_EXTENSION \
  -DSQLITE_ENABLE_DESERIALIZE \
  -DSQLITE_DEBUG \
  -DSQLITE_ENABLE_DBSTAT_VTAB \
  -DSQLITE_ENABLE_BYTECODE_VTAB \
  -DSQLITE_ENABLE_RTREE \
  -DSQLITE_ENABLE_FTS4 \
  -DSQLITE_ENABLE_FTS5

dbfuzz2$(EXE):	$(TOP)/test/dbfuzz2.c sqlite3.c sqlite3.h
	$(TCCX) -I. -g -O0 -DSTANDALONE -o dbfuzz2$(EXE) \
	  $(DBFUZZ2_OPTS) $(TOP)/test/dbfuzz2.c sqlite3.c  $(TLIBS) $(THREADLIB)

fuzzcheck$(EXE):	$(TOP)/test/fuzzcheck.c sqlite3.c sqlite3.h $(TOP)/test/ossfuzz.c
	$(TCCX) -o fuzzcheck$(EXE) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION \
		-DSQLITE_ENABLE_MEMSYS5 $(FUZZCHECK_OPT) -DSQLITE_OSS_FUZZ \
		$(TOP)/test/fuzzcheck.c $(TOP)/test/ossfuzz.c sqlite3.c $(TLIBS) $(THREADLIB)

ossshell$(EXE):	$(TOP)/test/ossfuzz.c $(TOP)/test/ossshell.c sqlite3.c sqlite3.h
	$(TCCX) -o ossshell$(EXE) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION \
		-DSQLITE_ENABLE_MEMSYS5 $(FUZZCHECK_OPT) \
		$(TOP)/test/ossfuzz.c $(TOP)/test/ossshell.c sqlite3.c $(TLIBS) $(THREADLIB)

sessionfuzz$(EXE):	$(TOP)/test/sessionfuzz.c sqlite3.c sqlite3.h
	$(TCC) -o sessionfuzz$(EXE) $(TOP)/test/sessionfuzz.c -lz $(TLIBS) $(THREADLIB)

mptester$(EXE):	sqlite3.c $(TOP)/mptest/mptest.c
	$(TCCX) -o $@ -I. $(TOP)/mptest/mptest.c sqlite3.c \
		$(TLIBS) $(THREADLIB)

MPTEST1=./mptester$(EXE) mptest1.db $(TOP)/mptest/crash01.test --repeat 20
MPTEST2=./mptester$(EXE) mptest2.db $(TOP)/mptest/multiwrite01.test --repeat 20
mptest:	mptester$(EXE)
	$(MPTEST1) --journalmode DELETE
	$(MPTEST2) --journalmode WAL
	$(MPTEST1) --journalmode WAL
	$(MPTEST2) --journalmode PERSIST
	$(MPTEST1) --journalmode PERSIST
	$(MPTEST2) --journalmode TRUNCATE
	$(MPTEST1) --journalmode TRUNCATE
	$(MPTEST2) --journalmode DELETE

sqlite3.o:	sqlite3.c
	$(TCCX) -I. -c sqlite3.c

# This target creates a directory named "tsrc" and fills it with
# copies of all of the C source code and header files needed to
# build on the target system.  Some of the C source code and header
# files are automatically generated.  This target takes care of
# all that automatic generation.
#
target_source:	$(SRC) $(TOP)/tool/vdbe-compress.tcl fts5.c
	rm -rf tsrc
	mkdir tsrc
	cp -f $(SRC) tsrc
	rm tsrc/sqlite.h.in tsrc/parse.y
	tclsh $(TOP)/tool/vdbe-compress.tcl $(OPTS) <tsrc/vdbe.c >vdbe.new
	mv vdbe.new tsrc/vdbe.c
	cp fts5.c fts5.h tsrc
	touch target_source

sqlite3.c:	target_source $(TOP)/tool/mksqlite3c.tcl
	tclsh $(TOP)/tool/mksqlite3c.tcl
	cp tsrc/sqlite3ext.h .
	cp $(TOP)/ext/session/sqlite3session.h .
	echo '#ifndef USE_SYSTEM_SQLITE' >tclsqlite3.c
	cat sqlite3.c >>tclsqlite3.c
	echo '#endif /* USE_SYSTEM_SQLITE */' >>tclsqlite3.c
	cat $(TOP)/src/tclsqlite.c >>tclsqlite3.c

sqlite3ext.h:	target_source
	cp tsrc/sqlite3ext.h .

sqlite3.c-debug:	target_source $(TOP)/tool/mksqlite3c.tcl
	tclsh $(TOP)/tool/mksqlite3c.tcl --linemacros
	echo '#ifndef USE_SYSTEM_SQLITE' >tclsqlite3.c
	cat sqlite3.c >>tclsqlite3.c
	echo '#endif /* USE_SYSTEM_SQLITE */' >>tclsqlite3.c
	echo '#line 1 "tclsqlite.c"' >>tclsqlite3.c
	cat $(TOP)/src/tclsqlite.c >>tclsqlite3.c

sqlite3-all.c:	sqlite3.c $(TOP)/tool/split-sqlite3c.tcl
	tclsh $(TOP)/tool/split-sqlite3c.tcl

fts2amal.c:	target_source $(TOP)/ext/fts2/mkfts2amal.tcl
	tclsh $(TOP)/ext/fts2/mkfts2amal.tcl

fts3amal.c:	target_source $(TOP)/ext/fts3/mkfts3amal.tcl
	tclsh $(TOP)/ext/fts3/mkfts3amal.tcl

# Rules to build the LEMON compiler generator
#
lemon:	$(TOP)/tool/lemon.c $(TOP)/tool/lempar.c
	$(BCC) -o lemon $(TOP)/tool/lemon.c
	cp $(TOP)/tool/lempar.c .

# A tool to generate the source-id
#
mksourceid:	$(TOP)/tool/mksourceid.c
	$(BCC) -o mksourceid $(TOP)/tool/mksourceid.c

# Rules to build individual *.o files from generated *.c files. This
# applies to:
#
#     parse.o
#     opcodes.o
#
%.o: %.c $(HDR)
	$(TCCX) -c $<

# Rules to build individual *.o files from files in the src directory.
#
%.o: $(TOP)/src/%.c $(HDR)
	$(TCCX) -c $<

tclsqlite.o:	$(TOP)/src/tclsqlite.c $(HDR)
	$(TCCX) $(TCL_FLAGS) -c $(TOP)/src/tclsqlite.c



# Rules to build opcodes.c and opcodes.h
#
opcodes.c:	opcodes.h $(TOP)/tool/mkopcodec.tcl
	tclsh $(TOP)/tool/mkopcodec.tcl opcodes.h >opcodes.c

opcodes.h:	parse.h $(TOP)/src/vdbe.c $(TOP)/tool/mkopcodeh.tcl
	cat parse.h $(TOP)/src/vdbe.c | \
		tclsh $(TOP)/tool/mkopcodeh.tcl >opcodes.h

# Rules to build parse.c and parse.h - the outputs of lemon.
#
parse.h:	parse.c

parse.c:	$(TOP)/src/parse.y lemon
	cp $(TOP)/src/parse.y .
	./lemon -s $(OPTS) parse.y

sqlite3.h:	$(TOP)/src/sqlite.h.in $(TOP)/manifest mksourceid $(TOP)/VERSION $(TOP)/ext/rtree/sqlite3rtree.h
	tclsh $(TOP)/tool/mksqlite3h.tcl $(TOP) >sqlite3.h

sqlite3rc.h:	$(TOP)/src/sqlite3.rc $(TOP)/VERSION
	echo '#ifndef SQLITE_RESOURCE_VERSION' >$@
	echo -n '#define SQLITE_RESOURCE_VERSION ' >>$@
	cat $(TOP)/VERSION | tclsh $(TOP)/tool/replace.tcl exact . , >>$@
	echo '#endif' >>sqlite3rc.h

keywordhash.h:	$(TOP)/tool/mkkeywordhash.c
	$(BCC) -o mkkeywordhash $(OPTS) $(TOP)/tool/mkkeywordhash.c
	./mkkeywordhash >keywordhash.h

# Source files that go into making shell.c
SHELL_SRC = \
	$(TOP)/src/shell.c.in \
        $(TOP)/ext/misc/appendvfs.c \
	$(TOP)/ext/misc/completion.c \
        $(TOP)/ext/misc/decimal.c \
	$(TOP)/ext/misc/fileio.c \
        $(TOP)/ext/misc/ieee754.c \
	$(TOP)/ext/misc/shathree.c \
	$(TOP)/ext/misc/sqlar.c \
        $(TOP)/ext/misc/uint.c \
	$(TOP)/ext/expert/sqlite3expert.c \
	$(TOP)/ext/expert/sqlite3expert.h \
	$(TOP)/ext/misc/zipfile.c \
	$(TOP)/ext/misc/memtrace.c \
	$(TOP)/ext/misc/dbdata.c \
        $(TOP)/src/test_windirent.c

shell.c:	$(SHELL_SRC) $(TOP)/tool/mkshellc.tcl
	tclsh $(TOP)/tool/mkshellc.tcl >shell.c



# Rules to build the extension objects.
#
icu.o:	$(TOP)/ext/icu/icu.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/icu/icu.c

fts2.o:	$(TOP)/ext/fts2/fts2.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts2/fts2.c

fts2_hash.o:	$(TOP)/ext/fts2/fts2_hash.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts2/fts2_hash.c

fts2_icu.o:	$(TOP)/ext/fts2/fts2_icu.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts2/fts2_icu.c

fts2_porter.o:	$(TOP)/ext/fts2/fts2_porter.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts2/fts2_porter.c

fts2_tokenizer.o:	$(TOP)/ext/fts2/fts2_tokenizer.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts2/fts2_tokenizer.c

fts2_tokenizer1.o:	$(TOP)/ext/fts2/fts2_tokenizer1.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts2/fts2_tokenizer1.c

fts3.o:	$(TOP)/ext/fts3/fts3.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3.c

fts3_aux.o:	$(TOP)/ext/fts3/fts3_aux.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_aux.c

fts3_expr.o:	$(TOP)/ext/fts3/fts3_expr.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_expr.c

fts3_hash.o:	$(TOP)/ext/fts3/fts3_hash.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_hash.c

fts3_icu.o:	$(TOP)/ext/fts3/fts3_icu.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_icu.c

fts3_snippet.o:	$(TOP)/ext/fts3/fts3_snippet.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_snippet.c

fts3_porter.o:	$(TOP)/ext/fts3/fts3_porter.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_porter.c

fts3_tokenizer.o:	$(TOP)/ext/fts3/fts3_tokenizer.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_tokenizer.c

fts3_tokenizer1.o:	$(TOP)/ext/fts3/fts3_tokenizer1.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_tokenizer1.c

fts3_tokenize_vtab.o:	$(TOP)/ext/fts3/fts3_tokenize_vtab.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_tokenize_vtab.c

fts3_unicode.o:	$(TOP)/ext/fts3/fts3_unicode.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_unicode.c

fts3_unicode2.o:	$(TOP)/ext/fts3/fts3_unicode2.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_unicode2.c

fts3_write.o:	$(TOP)/ext/fts3/fts3_write.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/fts3/fts3_write.c

fts5.o:	fts5.c
	$(TCCX) -DSQLITE_CORE -c fts5.c

json1.o:	$(TOP)/ext/misc/json1.c
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/misc/json1.c

stmt.o:	$(TOP)/ext/misc/stmt.c
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/misc/stmt.c

rtree.o:	$(TOP)/ext/rtree/rtree.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/rtree/rtree.c



fts5parse.c:	$(TOP)/ext/fts5/fts5parse.y lemon
	cp $(TOP)/ext/fts5/fts5parse.y .
	rm -f fts5parse.h
	./lemon $(OPTS) fts5parse.y

fts5parse.h: fts5parse.c

fts5.c: $(FTS5_SRC) $(FTS5_HDR)
	tclsh $(TOP)/ext/fts5/tool/mkfts5c.tcl
	cp $(TOP)/ext/fts5/fts5.h .

lsm1.c: $(LSM1_SRC)
	tclsh $(TOP)/ext/lsm1/tool/mklsm1c.tcl
	cp $(TOP)/ext/lsm1/lsm.h .

userauth.o:	$(TOP)/ext/userauth/userauth.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/userauth/userauth.c

sqlite3session.o:	$(TOP)/ext/session/sqlite3session.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/session/sqlite3session.c

sqlite3rbu.o:	$(TOP)/ext/rbu/sqlite3rbu.c $(HDR) $(EXTHDR)
	$(TCCX) -DSQLITE_CORE -c $(TOP)/ext/rbu/sqlite3rbu.c

# Rules for building test programs and for running tests
#
tclsqlite3:	$(TOP)/src/tclsqlite.c libsqlite3.a
	$(TCCX) $(TCL_FLAGS) -DTCLSH -o tclsqlite3 \
		$(TOP)/src/tclsqlite.c libsqlite3.a $(LIBTCL) $(THREADLIB)

sqlite3_analyzer.c: sqlite3.c $(TOP)/src/tclsqlite.c $(TOP)/tool/spaceanal.tcl $(TOP)/tool/sqlite3_analyzer.c.in $(TOP)/tool/mkccode.tcl
	tclsh $(TOP)/tool/mkccode.tcl $(TOP)/tool/sqlite3_analyzer.c.in >sqlite3_analyzer.c

sqlite3_analyzer$(EXE): sqlite3_analyzer.c
	$(TCCX) $(TCL_FLAGS) sqlite3_analyzer.c -o $@ $(LIBTCL) $(THREADLIB)

sqltclsh.c: sqlite3.c $(TOP)/src/tclsqlite.c $(TOP)/tool/sqltclsh.tcl $(TOP)/ext/misc/appendvfs.c $(TOP)/tool/mkccode.tcl
	tclsh $(TOP)/tool/mkccode.tcl $(TOP)/tool/sqltclsh.c.in >sqltclsh.c

sqltclsh$(EXE): sqltclsh.c
	$(TCCX) $(TCL_FLAGS) sqltclsh.c -o $@ $(LIBTCL) $(THREADLIB)

sqlite3_expert$(EXE): $(TOP)/ext/expert/sqlite3expert.h $(TOP)/ext/expert/sqlite3expert.c $(TOP)/ext/expert/expert.c sqlite3.c
	$(TCCX) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION $(TOP)/ext/expert/sqlite3expert.c $(TOP)/ext/expert/expert.c sqlite3.c -o sqlite3_expert$(EXE) $(THREADLIB)

CHECKER_DEPS =\
  $(TOP)/tool/mkccode.tcl \
  sqlite3.c \
  $(TOP)/src/tclsqlite.c \
  $(TOP)/ext/repair/sqlite3_checker.tcl \
  $(TOP)/ext/repair/checkindex.c \
  $(TOP)/ext/repair/checkfreelist.c \
  $(TOP)/ext/misc/btreeinfo.c \
  $(TOP)/ext/repair/sqlite3_checker.c.in

sqlite3_checker.c:	$(CHECKER_DEPS)
	tclsh $(TOP)/tool/mkccode.tcl $(TOP)/ext/repair/sqlite3_checker.c.in >$@

sqlite3_checker$(TEXE):	sqlite3_checker.c
	$(TCCX) $(TCL_FLAGS) sqlite3_checker.c -o $@ $(LIBTCL) $(THREADLIB)

dbdump$(EXE):	$(TOP)/ext/misc/dbdump.c sqlite3.o
	$(TCCX) -DDBDUMP_STANDALONE -o dbdump$(EXE) \
            $(TOP)/ext/misc/dbdump.c sqlite3.o $(THREADLIB)

# Rules to build the 'testfixture' application.
#
TESTFIXTURE_FLAGS  = -DSQLITE_TEST=1 -DSQLITE_CRASH_TEST=1
TESTFIXTURE_FLAGS += -DSQLITE_SERVER=1 -DSQLITE_PRIVATE="" -DSQLITE_CORE
TESTFIXTURE_FLAGS += -DSQLITE_SERIES_CONSTRAINT_VERIFY=1
TESTFIXTURE_FLAGS += -DSQLITE_DEFAULT_PAGE_SIZE=1024
TESTFIXTURE_FLAGS += -DSQLITE_ENABLE_STMTVTAB
TESTFIXTURE_FLAGS += -DSQLITE_ENABLE_DBPAGE_VTAB
TESTFIXTURE_FLAGS += -DSQLITE_ENABLE_BYTECODE_VTAB
TESTFIXTURE_FLAGS += -DTCLSH_INIT_PROC=sqlite3TestInit

testfixture$(EXE): $(TESTSRC2) libsqlite3.a $(TESTSRC) $(TOP)/src/tclsqlite.c
	$(TCCX) $(TCL_FLAGS) $(TESTFIXTURE_FLAGS)                            \
		$(TESTSRC) $(TESTSRC2) $(TOP)/src/tclsqlite.c                \
		-o testfixture$(EXE) $(LIBTCL) libsqlite3.a $(THREADLIB)

amalgamation-testfixture$(EXE): sqlite3.c $(TESTSRC) $(TOP)/src/tclsqlite.c  \
				$(TOP)/ext/session/test_session.c
	$(TCCX) $(TCL_FLAGS) $(TESTFIXTURE_FLAGS)                            \
		$(TESTSRC) $(TOP)/src/tclsqlite.c sqlite3.c                  \
		$(TOP)/ext/session/test_session.c                            \
		-o testfixture$(EXE) $(LIBTCL) $(THREADLIB)

fts3-testfixture$(EXE): sqlite3.c fts3amal.c $(TESTSRC) $(TOP)/src/tclsqlite.c
	$(TCCX) $(TCL_FLAGS) $(TESTFIXTURE_FLAGS)                            \
	-DSQLITE_ENABLE_FTS3=1                                               \
		$(TESTSRC) $(TOP)/src/tclsqlite.c sqlite3.c fts3amal.c       \
		-o testfixture$(EXE) $(LIBTCL) $(THREADLIB)

coretestprogs:	$(TESTPROGS)

testprogs:	coretestprogs srcck1$(EXE) fuzzcheck$(EXE) sessionfuzz$(EXE)

fulltest:	$(TESTPROGS) fuzztest
	./testfixture$(EXE) $(TOP)/test/all.test $(TESTOPTS)

soaktest:	$(TESTPROGS)
	./testfixture$(EXE) $(TOP)/test/all.test -soak=1 $(TESTOPTS)

fulltestonly:	$(TESTPROGS) fuzztest
	./testfixture$(EXE) $(TOP)/test/full.test $(TESTOPTS)

queryplantest:	testfixture$(EXE) sqlite3$(EXE)
	./testfixture$(EXE) $(TOP)/test/permutations.test queryplanner $(TESTOPTS)

fuzztest:	fuzzcheck$(EXE) $(FUZZDATA) sessionfuzz$(EXE) $(TOP)/test/sessionfuzz-data1.db
	./fuzzcheck$(EXE) $(FUZZDATA)
	./sessionfuzz run $(TOP)/test/sessionfuzz-data1.db

valgrindfuzz:	fuzzcheck$(EXE) $(FUZZDATA) sessionfuzz$(EXE) $(TOP)/test/sessionfuzz-data1.db
	valgrind ./fuzzcheck$(EXE) --cell-size-check --limit-mem 10M --timeout 600 $(FUZZDATA)
	valgrind ./sessionfuzz run $(TOP)/test/sessionfuzz-data1.db

# The veryquick.test TCL tests.
#
tcltest:	./testfixture$(EXE)
	./testfixture$(EXE) $(TOP)/test/veryquick.test $(TESTOPTS)

# A very quick test using only testfixture and omitting all the slower
# tests.  Designed to run in under 3 minutes on a workstation.
#
quicktest:	./testfixture$(EXE)
	./testfixture$(EXE) $(TOP)/test/extraquick.test $(TESTOPTS)

# The default test case.  Runs most of the faster standard TCL tests,
# and fuzz tests, and sqlite3_analyzer and sqldiff tests.
test:	fuzztest sourcetest $(TESTPROGS) tcltest

# Run a test using valgrind.  This can take a really long time
# because valgrind is so much slower than a native machine.
#
valgrindtest:	$(TESTPROGS) valgrindfuzz
	OMIT_MISUSE=1 valgrind -v \
	./testfixture$(EXE) $(TOP)/test/permutations.test valgrind $(TESTOPTS)

# A very fast test that checks basic sanity.  The name comes from
# the 60s-era electronics testing:  "Turn it on and see if smoke
# comes out."
#
smoketest:	$(TESTPROGS) fuzzcheck$(EXE)
	./testfixture$(EXE) $(TOP)/test/main.test $(TESTOPTS)

shelltest: $(TESTPROGS)
	./testfixture$(EXT) $(TOP)/test/permutations.test shell

# The next two rules are used to support the "threadtest" target. Building
# threadtest runs a few thread-safety tests that are implemented in C. This
# target is invoked by the releasetest.tcl script.
#
THREADTEST3_SRC = $(TOP)/test/threadtest3.c    \
                  $(TOP)/test/tt3_checkpoint.c \
                  $(TOP)/test/tt3_index.c      \
                  $(TOP)/test/tt3_vacuum.c      \
                  $(TOP)/test/tt3_stress.c      \
                  $(TOP)/test/tt3_lookaside1.c

threadtest3$(EXE): sqlite3.o $(THREADTEST3_SRC) $(TOP)/src/test_multiplex.c
	$(TCCX) $(TOP)/test/threadtest3.c $(TOP)/src/test_multiplex.c sqlite3.o -o $@ $(THREADLIB)

threadtest: threadtest3$(EXE)
	./threadtest3$(EXE)

TEST_EXTENSION = $(SHPREFIX)testloadext.$(SO)
$(TEST_EXTENSION): $(TOP)/src/test_loadext.c
	$(MKSHLIB) $(TOP)/src/test_loadext.c -o $(TEST_EXTENSION)

extensiontest: testfixture$(EXE) $(TEST_EXTENSION)
	./testfixture$(EXE) $(TOP)/test/loadext.test

dbtotxt$(EXE):	$(TOP)/tool/dbtotxt.c
	$(TCC) -o dbtotxt$(EXE) $(TOP)/tool/dbtotxt.c

showdb$(EXE):	$(TOP)/tool/showdb.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o showdb$(EXE) \
		$(TOP)/tool/showdb.c sqlite3.o $(THREADLIB)

showstat4$(EXE):	$(TOP)/tool/showstat4.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o showstat4$(EXE) \
		$(TOP)/tool/showstat4.c sqlite3.o $(THREADLIB)

showjournal$(EXE):	$(TOP)/tool/showjournal.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o showjournal$(EXE) \
		$(TOP)/tool/showjournal.c sqlite3.o $(THREADLIB)

showwal$(EXE):	$(TOP)/tool/showwal.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o showwal$(EXE) \
		$(TOP)/tool/showwal.c sqlite3.o $(THREADLIB)

showshm$(EXE):	$(TOP)/tool/showshm.c
	$(TCC) -o showshm$(EXE) $(TOP)/tool/showshm.c

index_usage$(EXE): $(TOP)/tool/index_usage.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_DEPRECATED $(SHELL_OPTS) -o index_usage$(EXE) \
		$(TOP)/tool/index_usage.c sqlite3.o $(THREADLIB)

changeset$(EXE):	$(TOP)/ext/session/changeset.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o changeset$(EXE) \
		$(TOP)/ext/session/changeset.c sqlite3.o $(THREADLIB)

changesetfuzz$(EXE):	$(TOP)/ext/session/changesetfuzz.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o changesetfuzz$(EXE) \
		$(TOP)/ext/session/changesetfuzz.c sqlite3.o $(THREADLIB)

fts3view$(EXE):	$(TOP)/ext/fts3/tool/fts3view.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o fts3view$(EXE) \
		$(TOP)/ext/fts3/tool/fts3view.c sqlite3.o $(THREADLIB)

rollback-test$(EXE):	$(TOP)/tool/rollback-test.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o rollback-test$(EXE) \
		$(TOP)/tool/rollback-test.c sqlite3.o $(THREADLIB)

atrc$(EXE):	$(TOP)/test/atrc.c sqlite3.o
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o atrc$(EXE) \
		$(TOP)/test/atrc.c sqlite3.o $(THREADLIB)

LogEst$(EXE):	$(TOP)/tool/logest.c sqlite3.h
	$(TCC) -o LogEst$(EXE) $(TOP)/tool/logest.c

wordcount$(EXE):	$(TOP)/test/wordcount.c sqlite3.c
	$(TCC) -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -o wordcount$(EXE) \
		$(TOP)/test/wordcount.c sqlite3.c

speedtest1$(EXE):	$(TOP)/test/speedtest1.c sqlite3.c
	$(TCCX) -I. $(ST_OPT) -o speedtest1$(EXE) $(TOP)/test/speedtest1.c sqlite3.c $(THREADLIB)

kvtest$(EXE):	$(TOP)/test/kvtest.c sqlite3.c
	$(TCCX) -I. $(KV_OPT) -o kvtest$(EXE) $(TOP)/test/kvtest.c sqlite3.c $(THREADLIB)

rbu$(EXE): $(TOP)/ext/rbu/rbu.c $(TOP)/ext/rbu/sqlite3rbu.c sqlite3.o
	$(TCC) -I. -o rbu$(EXE) $(TOP)/ext/rbu/rbu.c sqlite3.o \
	  $(THREADLIB)

loadfts: $(TOP)/tool/loadfts.c libsqlite3.a
	$(TCC) $(TOP)/tool/loadfts.c libsqlite3.a -o loadfts $(THREADLIB)

# This target will fail if the SQLite amalgamation contains any exported
# symbols that do not begin with "sqlite3_". It is run as part of the
# releasetest.tcl script.
#
checksymbols: sqlite3.o
	nm -g --defined-only sqlite3.o | grep -v " sqlite3_" ; test $$? -ne 0

# Build the amalgamation-autoconf package.  The amalamgation-tarball target builds
# a tarball named for the version number.  Ex:  sqlite-autoconf-3110000.tar.gz.
# The snapshot-tarball target builds a tarball named by the SHA1 hash
#
amalgamation-tarball: sqlite3.c sqlite3rc.h
	TOP=$(TOP) sh $(TOP)/tool/mkautoconfamal.sh --normal

snapshot-tarball: sqlite3.c sqlite3rc.h
	TOP=$(TOP) sh $(TOP)/tool/mkautoconfamal.sh --snapshot


# Standard install and cleanup targets
#
install:	sqlite3 libsqlite3.a sqlite3.h
	mv sqlite3 /usr/bin
	mv libsqlite3.a /usr/lib
	mv sqlite3.h /usr/include

clean:
	rm -f *.o sqlite3 sqlite3.exe libsqlite3.a sqlite3.h opcodes.*
	rm -f lemon lemon.exe lempar.c parse.* sqlite*.tar.gz
	rm -f mkkeywordhash mkkeywordhash.exe keywordhash.h
	rm -f $(PUBLISH)
	rm -f *.da *.bb *.bbg gmon.out
	rm -rf tsrc target_source
	rm -f testloadext.dll libtestloadext.so
	rm -f amalgamation-testfixture amalgamation-testfixture.exe
	rm -f fts3-testfixture fts3-testfixture.exe
	rm -f testfixture testfixture.exe
	rm -f threadtest3 threadtest3.exe
	rm -f LogEst LogEst.exe
	rm -f fts3view fts3view.exe
	rm -f rollback-test rollback-test.exe
	rm -f showdb showdb.exe
	rm -f showjournal showjournal.exe
	rm -f showstat4 showstat4.exe
	rm -f showwal showwal.exe
	rm -f changeset changeset.exe
	rm -f speedtest1 speedtest1.exe
	rm -f wordcount wordcount.exe
	rm -f rbu rbu.exe
	rm -f srcck1 srcck1.exe
	rm -f sqlite3.c sqlite3-*.c fts?amal.c tclsqlite3.c
	rm -f sqlite3rc.h
	rm -f shell.c sqlite3ext.h
	rm -f sqlite3_analyzer sqlite3_analyzer.exe sqlite3_analyzer.c
	rm -f sqlite3_expert sqlite3_expert.exe
	rm -f sqlite-*-output.vsix
	rm -f mptester mptester.exe
	rm -f fuzzershell fuzzershell.exe
	rm -f fuzzcheck fuzzcheck.exe
	rm -f sessionfuzz
	rm -f sqldiff sqldiff.exe
	rm -f fts5.* fts5parse.*
	rm -f lsm.h lsm1.c
