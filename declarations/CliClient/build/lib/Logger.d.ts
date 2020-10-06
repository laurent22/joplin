export declare enum TargetType {
    Database = "database",
    File = "file",
    Console = "console"
}
declare enum LogLevel {
    None = 0,
    Error = 10,
    Warn = 20,
    Info = 30,
    Debug = 40
}
interface Target {
    type: TargetType;
    level?: LogLevel;
    database?: any;
    console?: any;
    prefix?: string;
    path?: string;
    source?: string;
}
declare class Logger {
    static LEVEL_NONE: LogLevel;
    static LEVEL_ERROR: LogLevel;
    static LEVEL_WARN: LogLevel;
    static LEVEL_INFO: LogLevel;
    static LEVEL_DEBUG: LogLevel;
    static fsDriver_: any;
    private targets_;
    private level_;
    private lastDbCleanup_;
    static fsDriver(): any;
    setLevel(level: LogLevel): void;
    level(): LogLevel;
    targets(): Target[];
    addTarget(type: TargetType, options?: any): void;
    objectToString(object: any): string;
    objectsToString(...object: any[]): string;
    static databaseCreateTableSql(): string;
    lastEntries(limit?: number, options?: any): Promise<any>;
    targetLevel(target: Target): LogLevel;
    log(level: LogLevel, ...object: any[]): void;
    error(...object: any[]): void;
    warn(...object: any[]): void;
    info(...object: any[]): void;
    debug(...object: any[]): void;
    static levelStringToId(s: string): LogLevel;
    static levelIdToString(id: LogLevel): "error" | "warn" | "info" | "none" | "debug";
    static levelIds(): LogLevel[];
}
export default Logger;
