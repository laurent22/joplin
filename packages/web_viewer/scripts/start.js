#!/usr/bin/env node

/**
 * カスタム起動スクリプト
 * --profileName 引数をパースして環境変数に設定してから Next.js を起動
 * 使用例: npm start -- --profileName joplin_desktop_test2
 */

const { spawn } = require('child_process');

// 引数をパース
const args = process.argv.slice(2);
let profileName = null;
const nextArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg.startsWith('--profileName=')) {
    profileName = arg.split('=')[1];
  } else if (arg === '--profileName') {
    profileName = args[i + 1];
    i++; // 次の引数をスキップ
  } else {
    nextArgs.push(arg);
  }
}

// 環境変数に設定
if (profileName) {
  process.env.PROFILE_NAME = profileName;
  console.log(`Using profile: ${profileName}`);
}

// Next.js を起動
const command = 'next';
const commandArgs = ['start', ...nextArgs];

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
