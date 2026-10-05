import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type { FileStore } from "./store";

/** A vault on local disk: the Mac copy, or a checkout of the GitHub mirror. */
export class LocalFileStore implements FileStore {
  constructor(readonly root: string) {}

  private abs(path: string) {
    if (path.split("/").includes("..")) throw new Error(`path escapes the vault: ${path}`);
    return join(this.root, ...path.split("/"));
  }

  async read(path: string) {
    try {
      return await readFile(this.abs(path), "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async write(path: string, text: string) {
    const file = this.abs(path);
    await mkdir(dirname(file), { recursive: true });
    // Write to a temp file and rename, so a crash never leaves a half-written item.
    const tmp = `${file}.tmp-${process.pid}`;
    await writeFile(tmp, text, "utf8");
    await rename(tmp, file);
  }

  async move(from: string, to: string) {
    if (await this.exists(to)) throw new Error(`${to} already exists`);
    await mkdir(dirname(this.abs(to)), { recursive: true });
    await rename(this.abs(from), this.abs(to));
  }

  async exists(path: string) {
    try {
      await stat(this.abs(path));
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix = "") {
    const start = prefix ? this.abs(prefix) : this.root;
    const out: string[] = [];
    const walk = async (dir: string) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (e.name.startsWith(".")) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else out.push(relative(this.root, full).split(sep).join("/"));
      }
    };
    await walk(start);
    return out.sort();
  }
}
