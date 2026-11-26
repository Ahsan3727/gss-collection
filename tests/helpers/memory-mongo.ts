import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

function findSystemMongod(): string | undefined {
  if (process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(process.env.MONGOMS_SYSTEM_BINARY)) {
    return process.env.MONGOMS_SYSTEM_BINARY;
  }
  const commonPaths = [
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const cmd = process.platform === 'win32' ? 'where mongod' : 'which mongod';
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)[0]
      ?.trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    // Fall back to mongodb-memory-server managed download (e.g. in CI)
  }
  return undefined;
}

/**
 * Starts an isolated ephemeral MongoMemoryServer instance, reusing a locally installed
 * `mongod` executable when present to avoid a 600 MB binary download.
 */
export async function createMemoryMongo(): Promise<MongoMemoryServer> {
  const systemBinary = findSystemMongod();
  return MongoMemoryServer.create(
    systemBinary ? { binary: { systemBinary } } : undefined
  );
}
