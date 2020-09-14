/*
** 2001 September 15
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** Header file for the Virtual DataBase Engine (VDBE)
**
** This header defines the interface to the virtual database engine
** or VDBE.  The VDBE implements an abstract machine that runs a
** simple program to access and modify the underlying database.
*/
#ifndef SQLITE_VDBE_H
#define SQLITE_VDBE_H
#include <stdio.h>

/*
** A single VDBE is an opaque structure named "Vdbe".  Only routines
** in the source file sqliteVdbe.c are allowed to see the insides
** of this structure.
*/
typedef struct Vdbe Vdbe;

/*
** The names of the following types declared in vdbeInt.h are required
** for the VdbeOp definition.
*/
typedef struct sqlite3_value Mem;
typedef struct SubProgram SubProgram;

/*
** A single instruction of the virtual machine has an opcode
** and as many as three operands.  The instruction is recorded
** as an instance of the following structure:
*/
struct VdbeOp {
  u8 opcode;          /* What operation to perform */
  signed char p4type; /* One of the P4_xxx constants for p4 */
  u16 p5;             /* Fifth parameter is an unsigned 16-bit integer */
  int p1;             /* First operand */
  int p2;             /* Second parameter (often the jump destination) */
  int p3;             /* The third parameter */
  union p4union {     /* fourth parameter */
    int i;                 /* Integer value if p4type==P4_INT32 */
    void *p;               /* Generic pointer */
    char *z;               /* Pointer to data for string (char array) types */
    i64 *pI64;             /* Used when p4type is P4_INT64 */
    double *pReal;         /* Used when p4type is P4_REAL */
    FuncDef *pFunc;        /* Used when p4type is P4_FUNCDEF */
    sqlite3_context *pCtx; /* Used when p4type is P4_FUNCCTX */
    CollSeq *pColl;        /* Used when p4type is P4_COLLSEQ */
    Mem *pMem;             /* Used when p4type is P4_MEM */
    VTable *pVtab;         /* Used when p4type is P4_VTAB */
    KeyInfo *pKeyInfo;     /* Used when p4type is P4_KEYINFO */
    u32 *ai;               /* Used when p4type is P4_INTARRAY */
    SubProgram *pProgram;  /* Used when p4type is P4_SUBPROGRAM */
    Table *pTab;           /* Used when p4type is P4_TABLE */
#ifdef SQLITE_ENABLE_CURSOR_HINTS
    Expr *pExpr;           /* Used when p4type is P4_EXPR */
#endif
    int (*xAdvance)(BtCursor *, int);
  } p4;
#ifdef SQLITE_ENABLE_EXPLAIN_COMMENTS
  char *zComment;          /* Comment to improve readability */
#endif
#ifdef VDBE_PROFILE
  u32 cnt;                 /* Number of times this instruction was executed */
  u64 cycles;              /* Total time spent executing this instruction */
#endif
#ifdef SQLITE_VDBE_COVERAGE
  u32 iSrcLine;            /* Source-code line that generated this opcode
                           ** with flags in the upper 8 bits */
#endif
};
typedef struct VdbeOp VdbeOp;


/*
** A sub-routine used to implement a trigger program.
*/
struct SubProgram {
  VdbeOp *aOp;                  /* Array of opcodes for sub-program */
  int nOp;                      /* Elements in aOp[] */
  int nMem;                     /* Number of memory cells required */
  int nCsr;                     /* Number of cursors required */
  u8 *aOnce;                    /* Array of OP_Once flags */
  void *token;                  /* id that may be used to recursive triggers */
  SubProgram *pNext;            /* Next sub-program already visited */
};

/*
** A smaller version of VdbeOp used for the VdbeAddOpList() function because
** it takes up less space.
*/
struct VdbeOpList {
  u8 opcode;          /* What operation to perform */
  signed char p1;     /* First operand */
  signed char p2;     /* Second parameter (often the jump destination) */
  signed char p3;     /* Third parameter */
};
typedef struct VdbeOpList VdbeOpList;

/*
** Allowed values of VdbeOp.p4type
*/
#define P4_NOTUSED      0   /* The P4 parameter is not used */
#define P4_TRANSIENT    0   /* P4 is a pointer to a transient string */
#define P4_STATIC     (-1)  /* Pointer to a static string */
#define P4_COLLSEQ    (-2)  /* P4 is a pointer to a CollSeq structure */
#define P4_INT32      (-3)  /* P4 is a 32-bit signed integer */
#define P4_SUBPROGRAM (-4)  /* P4 is a pointer to a SubProgram structure */
#define P4_ADVANCE    (-5)  /* P4 is a pointer to BtreeNext() or BtreePrev() */
#define P4_TABLE      (-6)  /* P4 is a pointer to a Table structure */
/* Above do not own any resources.  Must free those below */
#define P4_FREE_IF_LE (-7)
#define P4_DYNAMIC    (-7)  /* Pointer to memory from sqliteMalloc() */
#define P4_FUNCDEF    (-8)  /* P4 is a pointer to a FuncDef structure */
#define P4_KEYINFO    (-9)  /* P4 is a pointer to a KeyInfo structure */
#define P4_EXPR       (-10) /* P4 is a pointer to an Expr tree */
#define P4_MEM        (-11) /* P4 is a pointer to a Mem*    structure */
#define P4_VTAB       (-12) /* P4 is a pointer to an sqlite3_vtab structure */
#define P4_REAL       (-13) /* P4 is a 64-bit floating point value */
#define P4_INT64      (-14) /* P4 is a 64-bit signed integer */
#define P4_INTARRAY   (-15) /* P4 is a vector of 32-bit integers */
#define P4_FUNCCTX    (-16) /* P4 is a pointer to an sqlite3_context object */
#define P4_DYNBLOB    (-17) /* Pointer to memory from sqliteMalloc() */

/* Error message codes for OP_Halt */
#define P5_ConstraintNotNull 1
#define P5_ConstraintUnique  2
#define P5_ConstraintCheck   3
#define P5_ConstraintFK      4

/*
** The Vdbe.aColName array contains 5n Mem structures, where n is the 
** number of columns of data returned by the statement.
*/
#define COLNAME_NAME     0
#define COLNAME_DECLTYPE 1
#define COLNAME_DATABASE 2
#define COLNAME_TABLE    3
#define COLNAME_COLUMN   4
#ifdef SQLITE_ENABLE_COLUMN_METADATA
# define COLNAME_N        5      /* Number of COLNAME_xxx symbols */
#else
# ifdef SQLITE_OMIT_DECLTYPE
#   define COLNAME_N      1      /* Store only the name */
# else
#   define COLNAME_N      2      /* Store the name and decltype */
# endif
#endif

/*
** The following macro converts a label returned by sqlite3VdbeMakeLabel()
** into an index into the Parse.aLabel[] array that contains the resolved
** address of that label.
*/
#define ADDR(X)  (~(X))

/*
** The makefile scans the vdbe.c source file and creates the "opcodes.h"
** header file that defines a number for each opcode used by the VDBE.
*/
#include "opcodes.h"

/*
** Additional non-public SQLITE_PREPARE_* flags
*/
#define SQLITE_PREPARE_SAVESQL  0x80  /* Preserve SQL text */
#define SQLITE_PREPARE_MASK     0x0f  /* Mask of public flags */

/*
** Prototypes for the VDBE interface.  See comments on the implementation
** for a description of what each of these routines does.
*/
Vdbe *sqlite3VdbeCreate(Parse*);
Parse *sqlite3VdbeParser(Vdbe*);
int sqlite3VdbeAddOp0(Vdbe*,int);
int sqlite3VdbeAddOp1(Vdbe*,int,int);
int sqlite3VdbeAddOp2(Vdbe*,int,int,int);
int sqlite3VdbeGoto(Vdbe*,int);
int sqlite3VdbeLoadString(Vdbe*,int,const char*);
void sqlite3VdbeMultiLoad(Vdbe*,int,const char*,...);
int sqlite3VdbeAddOp3(Vdbe*,int,int,int,int);
int sqlite3VdbeAddOp4(Vdbe*,int,int,int,int,const char *zP4,int);
int sqlite3VdbeAddOp4Dup8(Vdbe*,int,int,int,int,const u8*,int);
int sqlite3VdbeAddOp4Int(Vdbe*,int,int,int,int,int);
int sqlite3VdbeAddFunctionCall(Parse*,int,int,int,int,const FuncDef*,int);
void sqlite3VdbeEndCoroutine(Vdbe*,int);
#if defined(SQLITE_DEBUG) && !defined(SQLITE_TEST_REALLOC_STRESS)
  void sqlite3VdbeVerifyNoMallocRequired(Vdbe *p, int N);
  void sqlite3VdbeVerifyNoResultRow(Vdbe *p);
#else
# define sqlite3VdbeVerifyNoMallocRequired(A,B)
# define sqlite3VdbeVerifyNoResultRow(A)
#endif
#if defined(SQLITE_DEBUG)
  void sqlite3VdbeVerifyAbortable(Vdbe *p, int);
#else
# define sqlite3VdbeVerifyAbortable(A,B)
#endif
VdbeOp *sqlite3VdbeAddOpList(Vdbe*, int nOp, VdbeOpList const *aOp,int iLineno);
#ifndef SQLITE_OMIT_EXPLAIN
  void sqlite3VdbeExplain(Parse*,u8,const char*,...);
  void sqlite3VdbeExplainPop(Parse*);
  int sqlite3VdbeExplainParent(Parse*);
# define ExplainQueryPlan(P)        sqlite3VdbeExplain P
# define ExplainQueryPlanPop(P)     sqlite3VdbeExplainPop(P)
# define ExplainQueryPlanParent(P)  sqlite3VdbeExplainParent(P)
#else
# define ExplainQueryPlan(P)
# define ExplainQueryPlanPop(P)
# define ExplainQueryPlanParent(P) 0
# define sqlite3ExplainBreakpoint(A,B) /*no-op*/
#endif
#if defined(SQLITE_DEBUG) && !defined(SQLITE_OMIT_EXPLAIN)
  void sqlite3ExplainBreakpoint(const char*,const char*);
#else
# define sqlite3ExplainBreakpoint(A,B) /*no-op*/
#endif
void sqlite3VdbeAddParseSchemaOp(Vdbe*,int,char*);
void sqlite3VdbeChangeOpcode(Vdbe*, int addr, u8);
void sqlite3VdbeChangeP1(Vdbe*, int addr, int P1);
void sqlite3VdbeChangeP2(Vdbe*, int addr, int P2);
void sqlite3VdbeChangeP3(Vdbe*, int addr, int P3);
void sqlite3VdbeChangeP5(Vdbe*, u16 P5);
void sqlite3VdbeJumpHere(Vdbe*, int addr);
void sqlite3VdbeJumpHereOrPopInst(Vdbe*, int addr);
int sqlite3VdbeChangeToNoop(Vdbe*, int addr);
int sqlite3VdbeDeletePriorOpcode(Vdbe*, u8 op);
#ifdef SQLITE_DEBUG
  void sqlite3VdbeReleaseRegisters(Parse*,int addr, int n, u32 mask, int);
#else
# define sqlite3VdbeReleaseRegisters(P,A,N,M,F)
#endif
void sqlite3VdbeChangeP4(Vdbe*, int addr, const char *zP4, int N);
void sqlite3VdbeAppendP4(Vdbe*, void *pP4, int p4type);
void sqlite3VdbeSetP4KeyInfo(Parse*, Index*);
void sqlite3VdbeUsesBtree(Vdbe*, int);
VdbeOp *sqlite3VdbeGetOp(Vdbe*, int);
int sqlite3VdbeMakeLabel(Parse*);
void sqlite3VdbeRunOnlyOnce(Vdbe*);
void sqlite3VdbeReusable(Vdbe*);
void sqlite3VdbeDelete(Vdbe*);
void sqlite3VdbeClearObject(sqlite3*,Vdbe*);
void sqlite3VdbeMakeReady(Vdbe*,Parse*);
int sqlite3VdbeFinalize(Vdbe*);
void sqlite3VdbeResolveLabel(Vdbe*, int);
int sqlite3VdbeCurrentAddr(Vdbe*);
#ifdef SQLITE_DEBUG
  int sqlite3VdbeAssertMayAbort(Vdbe *, int);
#endif
void sqlite3VdbeResetStepResult(Vdbe*);
void sqlite3VdbeRewind(Vdbe*);
int sqlite3VdbeReset(Vdbe*);
void sqlite3VdbeSetNumCols(Vdbe*,int);
int sqlite3VdbeSetColName(Vdbe*, int, int, const char *, void(*)(void*));
void sqlite3VdbeCountChanges(Vdbe*);
sqlite3 *sqlite3VdbeDb(Vdbe*);
u8 sqlite3VdbePrepareFlags(Vdbe*);
void sqlite3VdbeSetSql(Vdbe*, const char *z, int n, u8);
#ifdef SQLITE_ENABLE_NORMALIZE
void sqlite3VdbeAddDblquoteStr(sqlite3*,Vdbe*,const char*);
int sqlite3VdbeUsesDoubleQuotedString(Vdbe*,const char*);
#endif
void sqlite3VdbeSwap(Vdbe*,Vdbe*);
VdbeOp *sqlite3VdbeTakeOpArray(Vdbe*, int*, int*);
sqlite3_value *sqlite3VdbeGetBoundValue(Vdbe*, int, u8);
void sqlite3VdbeSetVarmask(Vdbe*, int);
#ifndef SQLITE_OMIT_TRACE
  char *sqlite3VdbeExpandSql(Vdbe*, const char*);
#endif
int sqlite3MemCompare(const Mem*, const Mem*, const CollSeq*);
int sqlite3BlobCompare(const Mem*, const Mem*);

void sqlite3VdbeRecordUnpack(KeyInfo*,int,const void*,UnpackedRecord*);
int sqlite3VdbeRecordCompare(int,const void*,UnpackedRecord*);
int sqlite3VdbeRecordCompareWithSkip(int, const void *, UnpackedRecord *, int);
UnpackedRecord *sqlite3VdbeAllocUnpackedRecord(KeyInfo*);

typedef int (*RecordCompare)(int,const void*,UnpackedRecord*);
RecordCompare sqlite3VdbeFindCompare(UnpackedRecord*);

void sqlite3VdbeLinkSubProgram(Vdbe *, SubProgram *);
int sqlite3VdbeHasSubProgram(Vdbe*);

int sqlite3NotPureFunc(sqlite3_context*);
#ifdef SQLITE_ENABLE_BYTECODE_VTAB
int sqlite3VdbeBytecodeVtabInit(sqlite3*);
#endif

/* Use SQLITE_ENABLE_COMMENTS to enable generation of extra comments on
** each VDBE opcode.
**
** Use the SQLITE_ENABLE_MODULE_COMMENTS macro to see some extra no-op
** comments in VDBE programs that show key decision points in the code
** generator.
*/
#ifdef SQLITE_ENABLE_EXPLAIN_COMMENTS
  void sqlite3VdbeComment(Vdbe*, const char*, ...);
# define VdbeComment(X)  sqlite3VdbeComment X
  void sqlite3VdbeNoopComment(Vdbe*, const char*, ...);
# define VdbeNoopComment(X)  sqlite3VdbeNoopComment X
# ifdef SQLITE_ENABLE_MODULE_COMMENTS
#   define VdbeModuleComment(X)  sqlite3VdbeNoopComment X
# else
#   define VdbeModuleComment(X)
# endif
#else
# define VdbeComment(X)
# define VdbeNoopComment(X)
# define VdbeModuleComment(X)
#endif

/*
** The VdbeCoverage macros are used to set a coverage testing point
** for VDBE branch instructions.  The coverage testing points are line
** numbers in the sqlite3.c source file.  VDBE branch coverage testing
** only works with an amalagmation build.  That's ok since a VDBE branch
** coverage build designed for testing the test suite only.  No application
** should ever ship with VDBE branch coverage measuring turned on.
**
**    VdbeCoverage(v)                  // Mark the previously coded instruction
**                                     // as a branch
**
**    VdbeCoverageIf(v, conditional)   // Mark previous if conditional true
**
**    VdbeCoverageAlwaysTaken(v)       // Previous branch is always taken
**
**    VdbeCoverageNeverTaken(v)        // Previous branch is never taken
**
**    VdbeCoverageNeverNull(v)         // Previous three-way branch is only
**                                     // taken on the first two ways.  The
**                                     // NULL option is not possible
**
**    VdbeCoverageEqNe(v)              // Previous OP_Jump is only interested
**                                     // in distingishing equal and not-equal.
**
** Every VDBE branch operation must be tagged with one of the macros above.
** If not, then when "make test" is run with -DSQLITE_VDBE_COVERAGE and
** -DSQLITE_DEBUG then an ALWAYS() will fail in the vdbeTakeBranch()
** routine in vdbe.c, alerting the developer to the missed tag.
**
** During testing, the test application will invoke
** sqlite3_test_control(SQLITE_TESTCTRL_VDBE_COVERAGE,...) to set a callback
** routine that is invoked as each bytecode branch is taken.  The callback
** contains the sqlite3.c source line number ov the VdbeCoverage macro and
** flags to indicate whether or not the branch was taken.  The test application
** is responsible for keeping track of this and reporting byte-code branches
** that are never taken.
**
** See the VdbeBranchTaken() macro and vdbeTakeBranch() function in the
** vdbe.c source file for additional information.
*/
#ifdef SQLITE_VDBE_COVERAGE
  void sqlite3VdbeSetLineNumber(Vdbe*,int);
# define VdbeCoverage(v) sqlite3VdbeSetLineNumber(v,__LINE__)
# define VdbeCoverageIf(v,x) if(x)sqlite3VdbeSetLineNumber(v,__LINE__)
# define VdbeCoverageAlwaysTaken(v) \
         sqlite3VdbeSetLineNumber(v,__LINE__|0x5000000);
# define VdbeCoverageNeverTaken(v) \
         sqlite3VdbeSetLineNumber(v,__LINE__|0x6000000);
# define VdbeCoverageNeverNull(v) \
         sqlite3VdbeSetLineNumber(v,__LINE__|0x4000000);
# define VdbeCoverageNeverNullIf(v,x) \
         if(x)sqlite3VdbeSetLineNumber(v,__LINE__|0x4000000);
# define VdbeCoverageEqNe(v) \
         sqlite3VdbeSetLineNumber(v,__LINE__|0x8000000);
# define VDBE_OFFSET_LINENO(x) (__LINE__+x)
#else
# define VdbeCoverage(v)
# define VdbeCoverageIf(v,x)
# define VdbeCoverageAlwaysTaken(v)
# define VdbeCoverageNeverTaken(v)
# define VdbeCoverageNeverNull(v)
# define VdbeCoverageNeverNullIf(v,x)
# define VdbeCoverageEqNe(v)
# define VDBE_OFFSET_LINENO(x) 0
#endif

#ifdef SQLITE_ENABLE_STMT_SCANSTATUS
void sqlite3VdbeScanStatus(Vdbe*, int, int, int, LogEst, const char*);
#else
# define sqlite3VdbeScanStatus(a,b,c,d,e)
#endif

#if defined(SQLITE_DEBUG) || defined(VDBE_PROFILE)
void sqlite3VdbePrintOp(FILE*, int, VdbeOp*);
#endif

#endif /* SQLITE_VDBE_H */
