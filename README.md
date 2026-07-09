# Joplin Privacy Toolkit

Joplin Privacy Toolkit is an unofficial desktop fork based on Joplin Desktop. It provides local profile access control and data-at-rest protection.

This project is not affiliated with, sponsored by, or endorsed by the official Joplin project.

[![中文](https://img.shields.io/badge/Language-%E4%B8%AD%E6%96%87-2f80ed?style=for-the-badge)](#简介)
[![English](https://img.shields.io/badge/Language-English-2f80ed?style=for-the-badge)](#project-positioning)

## 简介

Joplin Privacy Toolkit 是一个基于 Joplin Desktop 的非官方桌面端分支，用于实现本地 profile 的访问控制和静态数据保护能力

当前源码基于 Joplin Desktop `3.7.6`，保留了 Joplin 上游的 monorepo 结构、数据模型，采用以下思路实现本地隐私保护：

- 在桌面 UI 层提供 App Lock，降低已开启的 Joplin 界面被直接访问的风险
- 在数据库开启前增加 Encrypted Profile 解锁流程
- 使用 SQLCipher 对 `database.sqlite` 做静态加密
- 保留 Joplin 原有笔记、同步、插件和 profile 结构，避免把隐私功能做成不可维护的旁路实现

## 功能

### App Lock

App Lock 是桌面端界面访问锁，用于控制正在运行的 Joplin 桌面界面访问

- 启用或关闭 App Lock
- 启动时锁定
- 空闲后锁定
- 手动锁定命令
- 设置、更改和清除 App Lock 密码

App Lock 不加密本地文件，只控制 UI 访问

### Encrypted Profile

为实现数据库的静态加密，我们引入了Encrypted Profile功能，需要注意的是，Encrypted Profile尚处于测试阶段

- 使用 scrypt 从用户密码派生密钥
- 使用 AES-256-GCM 包装数据库密钥
- 使用 SQLCipher 打开加密后的 `database.sqlite`
- 从明文 `database.sqlite` 迁移到 SQLCipher 数据库
- 迁移失败时保留原数据库，避免启动锁死
- 迁移后保留明文备份，供用户确认后手动处理

需要注意的是，Encrypted Profile 密码与 App Lock 密码相互独立，可以选择性开启

以及，Joplin 官方提供了云端存储的端到端加密能力，本项目的 Encrypted Profile 是本地数据库静态加密路径，无法替代云端存储的端到端加密能力，因此仍建议你保持开启端到端加密能力

## 安全模型

### 加密实现原理

Encrypted Profile 使用两层密钥结构。用户输入的 Encrypted Profile 密码不会直接作为数据库密钥保存，也不会以明文形式写入 profile

启用时，程序生成独立的数据库密钥，并使用 scrypt 从用户密码派生出的包装密钥对数据库密钥进行 AES-256-GCM 加密，相关 salt、nonce、KDF 参数和加密后的数据库密钥写入 `profile-encryption.json`

Joplin 启动时会在打开本地数据库之前读取 `profile-encryption.json`，要求用户输入 Encrypted Profile 密码。密码校验成功后，程序解出数据库密钥，并在创建 SQLite 连接后立即向 SQLCipher 注入 key，再验证数据库是否可以正常读取。密码错误时，SQLCipher 无法打开加密后的 `database.sqlite`

从明文数据库迁移时，程序先保留原始 `database.sqlite`，再创建 SQLCipher 数据库并导出数据。迁移完成并验证成功后，新的 SQLCipher 数据库替换原数据库；如果迁移失败，原数据库会保留，避免 profile 进入无法启动的状态

### 受保护的内容

在 Encrypted Profile 已启用、迁移完成且 SQLCipher native 模块可用的情况下，

- `database.sqlite` 会以 SQLCipher 数据库形式存储

### 尚且无法保护的内容

当前实现不是完整 profile 加密，以下内容仍然以明文形式存在：

- `resources/` 中的附件和资源文件
- tmp 目录

## 仓库结构

仓库保留了 Joplin 上游 monorepo 结构，引入的安全模块集中在以下位置：

```text
packages/app-desktop/gui/
packages/app-desktop/services/appLock/
packages/app-desktop/services/encryptedProfile/
packages/lib/services/encryptedProfile/
packages/lib/database-driver-node.ts
packages/lib/models/settings/builtInMetadata.ts
```

- `AppLockService`：桌面端 UI 锁状态、密码校验和锁定行为
- `EncryptedProfileService`：profile 加密元数据、密码派生、数据库密钥包装
- `DatabaseDriverNode`：SQLCipher key 注入和数据库打开验证
- `EncryptedProfileUnlockScreen`：数据库打开前的解锁界面
- `encryptExistingProfileDatabase`：明文数据库迁移到 SQLCipher 数据库
- `verifyEncryptedProfile.manual.test.ts`：手动 profile 验证辅助脚本

## 构建

安装依赖：

```bash
yarn install --immutable
```

构建桌面端：

```bash
yarn workspace @joplin/app-desktop build
```

以开发模式启动桌面端：

```bash
cd packages/app-desktop
yarn start
```

如果本地 native 依赖下载失败，可以临时使用：

```bash
yarn install --immutable --mode=skip-build
```

只适合做 TypeScript 检查和部分测试，完整打包仍需要 native 依赖正常构建或下载

## 验证

建议至少运行以下检查：

```bash
yarn workspace @joplin/app-desktop tsc --noEmit
yarn workspace @joplin/renderer tsc
yarn workspace @joplin/lib tsc
yarn workspace @joplin/lib test services/encryptedProfile/EncryptedProfileService.test.ts services/encryptedProfile/migration.test.ts services/encryptedProfile/backup.test.ts services/encryptedProfile/migrationErrors.test.ts
yarn workspace @joplin/app-desktop test services/encryptedProfile/EncryptedProfileService.test.ts services/encryptedProfile/loadDesktopSqliteModule.test.ts services/encryptedProfile/scheduleEncryptedProfileMigrationAndRestart.test.ts services/appLock/AppLockService.test.ts utils/restartRelaunchArgs.test.ts app.reducer.test.ts
```

如果要验证 SQLCipher 迁移，请使用一次性测试 profile，不要直接在重要笔记数据上测试

## 平台状态

| 平台 | 状态 |
| --- | --- |
| Windows | 完成了相关单元测试和 SQLCipher native 模块的测试 |
| macOS | 我太懒了 还没在mac端测试hhh |
| Linux | 同上 |
| Mobile | 不在支持范围内 请启用OS提供的应用锁 |

## 许可证

沿用 Joplin 的许可证条款，见 [LICENSE](LICENSE)。

## Project Positioning

Joplin Privacy Toolkit is an unofficial desktop fork based on Joplin Desktop. It provides local profile access control and data-at-rest protection.

The current source is based on Joplin Desktop `3.7.6`. It keeps the upstream Joplin monorepo layout and data model, and implements local privacy protection through the following path:

- App Lock at the desktop UI layer to reduce the risk of direct access to an already-open Joplin window.
- Encrypted Profile unlock before the database is opened.
- SQLCipher encryption for `database.sqlite` at rest.
- Preservation of Joplin's existing notes, sync, plugin, and profile structure, avoiding an unmaintainable side path for privacy features.

## Current Features

### App Lock

App Lock protects access to the running desktop user interface.

- Enable or disable App Lock.
- Lock on startup.
- Lock after idle.
- Manual lock command.
- Set, change, and clear the App Lock password.

App Lock does not encrypt local files. It is a UI access control feature.

### Encrypted Profile

To provide database-at-rest encryption, this project introduces Encrypted Profile. Encrypted Profile is still experimental.

- scrypt-based password key derivation.
- AES-256-GCM wrapping for the database key.
- SQLCipher-backed access to the encrypted `database.sqlite`.
- Migration from plaintext `database.sqlite` to a SQLCipher database.
- Failure handling that avoids locking the user out of the original database.
- Plaintext migration backup retention for explicit user review.

The Encrypted Profile password is independent from the App Lock password.

Joplin provides end-to-end encryption for synced cloud storage. Encrypted Profile is a local database-at-rest encryption path and does not replace Joplin's sync end-to-end encryption. Keeping Joplin sync encryption enabled is still recommended.

## Security Model

### Encryption Design

Encrypted Profile uses a two-layer key structure. The user-entered Encrypted Profile password is not stored as plaintext and is not saved directly as the database key.

When the feature is enabled, the application generates a separate database key, derives a wrapping key from the user password with scrypt, and wraps the database key with AES-256-GCM. The salt, nonce, KDF parameters, and wrapped database key are stored in `profile-encryption.json`.

On startup, Joplin reads `profile-encryption.json` before opening the local database and asks for the Encrypted Profile password. After a successful password check, the application unwraps the database key, injects the key into SQLCipher immediately after creating the SQLite connection, and verifies that the database can be read. With an incorrect password, SQLCipher cannot open the encrypted `database.sqlite`.

During migration from a plaintext database, the application keeps the original `database.sqlite`, creates a SQLCipher database, and exports the data into it. After successful migration and verification, the SQLCipher database replaces the original database. If migration fails, the original database is preserved so that the profile remains usable.

### Protected Data

When Encrypted Profile is enabled, migration has completed, and the SQLCipher native module is available:

- `database.sqlite` is stored as a SQLCipher database.

### Data Outside the Current Protection Boundary

The current implementation is not full-profile encryption. The following data is still stored in plaintext:

- attachments and resources under `resources/`
- temporary files

## Repository Layout

This repository keeps the upstream Joplin monorepo layout. Privacy-related changes are concentrated in:

```text
packages/app-desktop/gui/
packages/app-desktop/services/appLock/
packages/app-desktop/services/encryptedProfile/
packages/lib/services/encryptedProfile/
packages/lib/database-driver-node.ts
packages/lib/models/settings/builtInMetadata.ts
```

- `AppLockService`: desktop UI lock state, password verification, and lock behavior.
- `EncryptedProfileService`: encrypted profile metadata, password key derivation, and database key wrapping.
- `DatabaseDriverNode`: SQLCipher key injection and database open verification.
- `EncryptedProfileUnlockScreen`: pre-database-open unlock screen.
- `encryptExistingProfileDatabase`: plaintext-to-SQLCipher database migration.
- `verifyEncryptedProfile.manual.test.ts`: helper for manual profile verification.

## Build

Install dependencies:

```bash
yarn install --immutable
```

Build the desktop app:

```bash
yarn workspace @joplin/app-desktop build
```

Start the desktop app in development mode:

```bash
cd packages/app-desktop
yarn start
```

If native dependency downloads fail in a local environment, the following can be used for type checking and partial tests:

```bash
yarn install --immutable --mode=skip-build
```

Full packaging still requires native dependencies to build or download correctly.

## Verification

Recommended checks:

```bash
yarn workspace @joplin/app-desktop tsc --noEmit
yarn workspace @joplin/renderer tsc
yarn workspace @joplin/lib tsc
yarn workspace @joplin/lib test services/encryptedProfile/EncryptedProfileService.test.ts services/encryptedProfile/migration.test.ts services/encryptedProfile/backup.test.ts services/encryptedProfile/migrationErrors.test.ts
yarn workspace @joplin/app-desktop test services/encryptedProfile/EncryptedProfileService.test.ts services/encryptedProfile/loadDesktopSqliteModule.test.ts services/encryptedProfile/scheduleEncryptedProfileMigrationAndRestart.test.ts services/appLock/AppLockService.test.ts utils/restartRelaunchArgs.test.ts app.reducer.test.ts
```

Use a disposable test profile when verifying SQLCipher migration. Do not test migration directly on important note data without an independent backup.

## Platform Status

| Platform | Status |
| --- | --- |
| Windows | Relevant unit tests and SQLCipher native module tests have been completed. |
| macOS | I have not tested this on macOS yet. |
| Linux | I have not configured a Linux test environment yet. |
| Mobile | Out of scope. Please use the application lock provided by the operating system. |

## License

This project follows Joplin's license terms. See [LICENSE](LICENSE).
