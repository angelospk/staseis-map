// Feedback endpoint for staseis.gr (src/lib/feedback.ts). Each POST adds a row to the
// "Feedback" tab of a Sheet and saves the screenshot, if any, to a Drive folder.
// Setup: docs/feedback/README.md. Script properties: SHEET_ID, FOLDER_ID, and TURNSTILE_SECRET (optional:
// without it there is no bot check and the Verified column stays empty).

const MAX_TEXT = 2000;
const MAX_BODY = 2 * 1024 * 1024; // the whole request, checked before parsing
const MAX_IMAGE = 1.5 * 1024 * 1024; // bytes after decoding; the page sends ~100-400 KB JPEGs
const PER_MINUTE = 20; // sends, all senders together: a flood stops here, not in the Sheet
const IMAGES_PER_DAY = 50; // at most ~75 MB of Drive a day, whatever happens
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN = 2048; // Turnstile's own limit

function doPost(e) {
  try {
    if (!e.postData || e.postData.length > MAX_BODY) return reply({ ok: false, error: "too_big" });
    const f = JSON.parse(e.postData.contents);
    const text = String(f.text || "").trim().slice(0, MAX_TEXT);
    if (text.length < 3) return reply({ ok: false, error: "empty" });
    if (!underLimit("n" + Math.floor(Date.now() / 60000), PER_MINUTE, 120)) return reply({ ok: false, error: "busy" });
    const props = PropertiesService.getScriptProperties();
    // Bot check: a row that fails it is kept, marked false; scripts/stopfix.ts treats it as CHECK BY HAND.
    const secret = props.getProperty("TURNSTILE_SECRET");
    const verified = secret ? turnstile(secret, f.turnstile).success : "";

    let imageUrl = "";
    const data = f.image && typeof f.image.data === "string" ? f.image.data : "";
    if (data) {
      // base64 is 4/3 of the bytes: check before decoding. A refused image refuses the whole send,
      // so the page keeps the draft and the image instead of losing the image silently.
      if (!TYPES[f.image.type] || data.length > MAX_IMAGE * 4 / 3 + 4) return reply({ ok: false, error: "bad_image" });
      if (!imagesLeftToday()) return reply({ ok: false, error: "busy" });
      const bytes = Utilities.base64Decode(data);
      const name = Utilities.formatDate(new Date(), "Europe/Athens", "yyyy-MM-dd_HH-mm-ss") + "." + TYPES[f.image.type];
      imageUrl = DriveApp.getFolderById(props.getProperty("FOLDER_ID"))
        .createFile(Utilities.newBlob(bytes, f.image.type, name)).getUrl();
    }

    const book = SpreadsheetApp.openById(props.getProperty("SHEET_ID"));
    const tab = book.getSheetByName("Feedback") || book.insertSheet("Feedback");
    if (tab.getLastRow() === 0) tab.appendRow(["Ώρα", "Κείμενο", "Έκδοση", "Σελίδα", "Συσκευή", "Εικόνα", "Logs", "Verified"]);
    else {  // a Sheet made before the Logs or Verified column
      if (tab.getRange("G1").isBlank()) tab.getRange("G1").setValue("Logs");
      if (tab.getRange("H1").isBlank()) tab.getRange("H1").setValue("Verified");
    }
    // Logs: the page's last requests and errors (JSON), for matching the report to the backend.
    const logs = f.diag ? JSON.stringify(f.diag).slice(0, 40000) : "";
    tab.appendRow([new Date(), cell(text), cell(f.version), cell(f.page), cell(f.ua), imageUrl, logs, verified]);  // JSON: starts with "{", never a formula
    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: "failed" });
  }
}

// Text that starts with = + - @ would run as a formula in the Sheet: store it as plain text.
function cell(v) {
  const s = String(v == null ? "" : v).slice(0, MAX_TEXT);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Counts one use of key and reports whether it is still within max (cache lives ttl seconds).
function underLimit(key, max, ttl) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const n = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(n), ttl);
    return n <= max;
  } finally {
    lock.releaseLock();
  }
}

// The daily image budget lives in the script properties: the cache may drop a counter early.
function imagesLeftToday() {
  const props = PropertiesService.getScriptProperties();
  const key = "images_" + Utilities.formatDate(new Date(), "Europe/Athens", "yyyy-MM-dd");
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const n = Number(props.getProperty(key) || 0) + 1;
    if (n > IMAGES_PER_DAY) return false;
    props.setProperty(key, String(n));
    return true;
  } finally {
    lock.releaseLock();
  }
}

// Cloudflare Turnstile: asks siteverify whether the page's token is good (each token checks once).
// Any failure (no token, network, a bad answer) is { success: false }, never an exception.
function turnstile(secret, token) {
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN) return { success: false, codes: ["missing-input-response"] };
  try {
    const r = UrlFetchApp.fetch(SITEVERIFY, { method: "post", payload: { secret: secret, response: token }, muteHttpExceptions: true });
    const o = r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : {};
    return { success: o.success === true, codes: o["error-codes"] || ["http-" + r.getResponseCode()] };
  } catch (err) {
    console.error(err);
    return { success: false, codes: ["fetch-failed"] };
  }
}

// Run once from the editor after adding TURNSTILE_SECRET: it asks for the "external requests" permission
// and checks the secret. "invalid-input-response" (a fake token) means the secret is fine;
// "invalid-input-secret" means it is wrong.
function checkTurnstileSetup() {
  const secret = PropertiesService.getScriptProperties().getProperty("TURNSTILE_SECRET");
  const msg = secret ? "siteverify: " + turnstile(secret, "setup-check").codes.join(", ") : "TURNSTILE_SECRET is not set";
  console.log(msg);
  return msg;
}

// Retention: the privacy policy keeps a report at most KEEP_MONTHS. A daily trigger (installPurgeTrigger)
// deletes older rows and puts their Drive screenshot in the trash (Drive empties the trash after 30 days).
// The Sheet's version history still holds deleted rows. Run purgeOld(true) from the editor first:
// it only logs the count. The trigger passes an event object, so only a literal true means dry run.
const KEEP_MONTHS = 12;

function purgeOld(dryRun) {
  const props = PropertiesService.getScriptProperties();
  const book = SpreadsheetApp.openById(props.getProperty("SHEET_ID"));
  const tab = book.getSheetByName("Feedback");
  if (!tab || tab.getLastRow() < 2) return 0;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - KEEP_MONTHS);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rows = tab.getRange(2, 1, tab.getLastRow() - 1, 6).getValues(); // A..F: time ... image URL
    let n = 0;
    for (let i = rows.length - 1; i >= 0; i--) { // bottom up: row numbers above stay valid
      const t = rows[i][0];
      if (!(t instanceof Date) || t >= cutoff) continue; // a hand-edited or blank time: keep, check by hand
      n++;
      if (dryRun === true) continue;
      trashImage(rows[i][5], props.getProperty("FOLDER_ID"));
      tab.deleteRow(i + 2);
    }
    console.log((dryRun === true ? "would delete " : "deleted ") + n + " rows older than " + KEEP_MONTHS + " months");
    return n;
  } finally {
    lock.releaseLock();
  }
}

// The editor's Run button passes no argument: run this one to see the count without deleting.
function purgeOldDryRun() {
  return purgeOld(true);
}

// Only a file that sits in the feedback folder is trashed, whatever the cell says.
function trashImage(url, folderId) {
  const m = /\/d\/([\w-]+)/.exec(String(url || ""));
  if (!m) return;
  try {
    const file = DriveApp.getFileById(m[1]);
    const parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === folderId) { file.setTrashed(true); return; }
    }
  } catch (err) {
    console.error("image already gone or not reachable");
  }
}

// Run once from the editor: runs purgeOld every day at about 03:00 (script time zone), and replaces an older trigger.
function installPurgeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "purgeOld"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("purgeOld").timeBased().everyDays(1).atHour(3).create();
}

function reply(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
