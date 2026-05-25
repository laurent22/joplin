import jest_base_setup_508 from '../../jest.base-setup.js';
import { shimInit } from '@joplin/lib/shim-init-node.js';
import nodeSqlite from 'sqlite3';
jest_base_setup_508();

shimInit({ nodeSqlite });

// We don't want the tests to fail due to timeout, especially on CI, and certain
// tests can take more time since we do integration testing too. The share tests
// in particular can take a while.

jest.setTimeout(120 * 1000);

process.env.JOPLIN_IS_TESTING = '1';
