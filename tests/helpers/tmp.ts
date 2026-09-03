import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function makeTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `gw-${prefix}-${randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
