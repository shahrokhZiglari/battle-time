import type { SfxKey } from "./sound";

export interface CustomSfxRecord {
  key: SfxKey;
  name: string;
  mime: string;
  bytes: ArrayBuffer;
  buffer: AudioBuffer | null;
}

const DB_NAME = "bt_custom_sfx_v1";
const STORE_NAME = "clips";
const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // حداکثر ۱۲ مگابایت برای هر افکت

const records = new Map<SfxKey, CustomSfxRecord>();
const listeners = new Set<(key?: SfxKey) => void>();
let initialized = false;

function notify(key?: SfxKey) {
  for (const fn of listeners) {
    try {
      fn(key);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function onCustomSfxChange(fn: (key?: SfxKey) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function dbPut(entry: { key: SfxKey; name: string; mime: string; bytes: ArrayBuffer }): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function dbDelete(key?: SfxKey): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      if (key) store.delete(key);
      else store.clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function decodeWithContext(ctx: AudioContext | null, bytes: ArrayBuffer): Promise<AudioBuffer | null> {
  if (!ctx || typeof ctx.decodeAudioData !== "function") return null;
  try {
    return await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    return null;
  }
}

/** بارگذاری اولیهٔ صداهای آپلودشده از IndexedDB در شروع برنامه */
export async function initCustomSfx(getCtx: () => AudioContext | null): Promise<void> {
  if (initialized) return;
  initialized = true;
  const db = await openDb();
  if (!db) return;
  const rows = await new Promise<{ key: SfxKey; name: string; mime: string; bytes: ArrayBuffer }[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        db.close();
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => { db.close(); resolve([]); };
    } catch {
      db.close();
      resolve([]);
    }
  });
  for (const row of rows) {
    if (!row?.key || !(row.bytes instanceof ArrayBuffer)) continue;
    records.set(row.key, {
      key: row.key,
      name: String(row.name || row.key),
      mime: String(row.mime || "audio/*"),
      bytes: row.bytes,
      buffer: null,
    });
  }
  if (rows.length > 0) {
    notify();
    // رمزگشایی پس‌زمینه در صورت آماده بودن AudioContext
    const ctx = getCtx();
    if (ctx) {
      for (const rec of records.values()) {
        if (!rec.buffer) rec.buffer = await decodeWithContext(ctx, rec.bytes);
      }
      notify();
    }
  }
}

export function hasCustomSfx(key: SfxKey): boolean {
  return records.has(key);
}

export function getCustomSfxMeta(): Partial<Record<SfxKey, string>> {
  const out: Partial<Record<SfxKey, string>> = {};
  for (const [k, v] of records.entries()) out[k] = v.name;
  return out;
}

export async function ensureCustomSfxBuffer(key: SfxKey, ctx: AudioContext | null): Promise<AudioBuffer | null> {
  const rec = records.get(key);
  if (!rec) return null;
  if (rec.buffer) return rec.buffer;
  rec.buffer = await decodeWithContext(ctx, rec.bytes);
  return rec.buffer;
}

export function getCachedCustomSfxBuffer(key: SfxKey): AudioBuffer | null {
  return records.get(key)?.buffer ?? null;
}

/** ثبت یک فایل صوتی جدید برای یک افکت */
export async function setCustomSfxBytes(
  key: SfxKey,
  name: string,
  mime: string,
  bytes: ArrayBuffer,
  ctx: AudioContext | null,
): Promise<{ ok: boolean; name?: string; error?: string }> {
  if (!bytes || bytes.byteLength === 0) {
    return { ok: false, error: "فایل صوتی انتخاب‌شده خالی است." };
  }
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    return { ok: false, error: "حجم فایل صوتی نباید بیشتر از ۱۲ مگابایت باشد." };
  }
  const buffer = await decodeWithContext(ctx, bytes);
  if (ctx && typeof ctx.decodeAudioData === "function" && !buffer) {
    return { ok: false, error: "فرمت این فایل صوتی توسط مرورگر پشتیبانی نمی‌شود." };
  }
  const cleanName = (name || key).trim().slice(0, 80);
  records.set(key, { key, name: cleanName, mime: mime || "audio/*", bytes: bytes.slice(0), buffer });
  await dbPut({ key, name: cleanName, mime: mime || "audio/*", bytes: bytes.slice(0) });
  notify(key);
  return { ok: true, name: cleanName };
}

/** بازگردانی یک افکت به صدای پیش‌فرض بازی */
export async function clearCustomSfx(key: SfxKey): Promise<void> {
  if (!records.has(key)) return;
  records.delete(key);
  await dbDelete(key);
  notify(key);
}

/** بازگردانی همهٔ افکت‌ها به صداهای پیش‌فرض بازی */
export async function clearAllCustomSfx(): Promise<void> {
  if (records.size === 0) return;
  records.clear();
  await dbDelete();
  notify();
}

/** باز کردن پنجرهٔ انتخاب فایل صوتی مرورگر برای یک افکت مشخص */
export function pickCustomSfxFile(
  key: SfxKey,
  getCtx: () => AudioContext | null,
): Promise<{ ok: boolean; cancelled?: boolean; name?: string; error?: string }> {
  if (typeof document === "undefined") {
    return Promise.resolve({ ok: false, error: "محیط مرورگر در دسترس نیست." });
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac";
    input.style.display = "none";
    let settled = false;
    const finish = (res: { ok: boolean; cancelled?: boolean; name?: string; error?: string }) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(res);
    };
    input.addEventListener("cancel", () => finish({ ok: false, cancelled: true }));
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ ok: false, cancelled: true });
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const res = await setCustomSfxBytes(key, file.name, file.type || "audio/*", bytes, getCtx());
        finish(res);
      } catch {
        finish({ ok: false, error: "خواندن فایل صوتی با خطا روبه‌رو شد." });
      }
    });
    document.body.appendChild(input);
    input.click();
  });
}
