const fs = require("node:fs");
const path = require("node:path");
const { redactSecrets } = require("../security/secretScanner.cjs");

// Maximum note content size (256KB)
const MAX_NOTE_SIZE = 256 * 1024;
// Maximum number of notes to prevent unbounded disk usage
const MAX_NOTES = 10000;

function slugify(value) {
  return String(value || "note")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "note";
}

/**
 * Safely resolve a note ID to a path inside notesDir.
 * Prevents path traversal by stripping directory separators and checking containment.
 */
function safeNotePath(notesDir, id) {
  // Strip all path separators and parent references to get a bare filename
  const basename = path.basename(String(id || "").replace(/\.\./g, ""));
  if (!basename) throw new Error("Invalid note ID.");
  const resolved = path.resolve(notesDir, basename);
  // Verify the resolved path is still inside the notes directory
  if (!resolved.startsWith(path.resolve(notesDir) + path.sep) && resolved !== path.resolve(notesDir)) {
    throw new Error("Note path is outside the allowed directory.");
  }
  return resolved;
}

function createNoteManager({ notesDir }) {
  function ensure() {
    fs.mkdirSync(notesDir, { recursive: true });
  }

  function listNotes() {
    ensure();
    const files = fs.readdirSync(notesDir)
      .filter((name) => name.toLowerCase().endsWith(".md") || name.toLowerCase().endsWith(".txt"));
    
    // Enforce max notes limit in listing (return most recent)
    return files
      .map((name) => {
        const filePath = path.join(notesDir, name);
        try {
          const stat = fs.statSync(filePath);
          return { id: name, name, path: filePath, size: stat.size, modified: stat.mtime.toISOString() };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.modified.localeCompare(a.modified))
      .slice(0, MAX_NOTES);
  }

  function createNote({ title, content, topic = "general" }) {
    ensure();

    // Validate inputs
    if (!title || typeof title !== "string") throw new Error("Note title is required.");
    if (title.length > 200) throw new Error("Note title must be 200 characters or less.");
    
    const safeContent = redactSecrets(content || "");
    if (safeContent.length > MAX_NOTE_SIZE) throw new Error(`Note content exceeds maximum size of ${MAX_NOTE_SIZE} bytes.`);
    
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `${stamp}-${slugify(title)}.md`;
    const filePath = safeNotePath(notesDir, name);
    if (fs.existsSync(filePath)) throw new Error("A note with this generated name already exists.");
    
    const body = [`# ${title}`, "", `Topic: ${topic}`, `Created: ${new Date().toISOString()}`, "", safeContent].join("\n");
    
    // Async write for performance
    fs.writeFile(filePath, body, "utf8", (err) => {
      if (err) console.error(`Failed to write note ${name}:`, err.message);
    });
    
    return { id: name, name, path: filePath, content: body };
  }

  function readNote(id) {
    ensure();
    const filePath = safeNotePath(notesDir, id);
    if (!fs.existsSync(filePath)) throw new Error("Note not found.");
    return { id: path.basename(filePath), path: filePath, content: fs.readFileSync(filePath, "utf8") };
  }

  function updateNote(id, content) {
    ensure();
    const filePath = safeNotePath(notesDir, id);
    if (!fs.existsSync(filePath)) throw new Error("Note not found.");
    
    const safeContent = redactSecrets(content || "");
    if (safeContent.length > MAX_NOTE_SIZE) throw new Error(`Note content exceeds maximum size of ${MAX_NOTE_SIZE} bytes.`);
    
    // Async write for performance
    fs.writeFile(filePath, safeContent, "utf8", (err) => {
      if (err) console.error(`Failed to update note ${id}:`, err.message);
    });
    
    return { id: path.basename(filePath), path: filePath, content: safeContent };
  }

  function deleteNote(id, shell) {
    const filePath = safeNotePath(notesDir, id);
    if (!fs.existsSync(filePath)) return { ok: true };
    if (shell?.trashItem) return shell.trashItem(filePath).then(() => ({ ok: true }));
    fs.renameSync(filePath, `${filePath}.deleted-${Date.now()}`);
    return { ok: true };
  }

  function searchNotes(query) {
    const term = String(query || "").toLowerCase();
    if (!term) return listNotes();
    return listNotes().filter((note) => {
      if (note.name.toLowerCase().includes(term)) return true;
      try {
        return fs.readFileSync(note.path, "utf8").toLowerCase().includes(term);
      } catch {
        return false;
      }
    });
  }

  return { notesDir, listNotes, createNote, readNote, updateNote, deleteNote, searchNotes };
}

module.exports = { createNoteManager, MAX_NOTE_SIZE, MAX_NOTES };
