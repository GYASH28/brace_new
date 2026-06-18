const fs = require('fs');
const path = require('path');

class DocumentManager {
  constructor() {
    this.libraryDir = path.join(__dirname, '..', '..', 'workspace', '.os', 'library');
    if (!fs.existsSync(this.libraryDir)) {
      fs.mkdirSync(this.libraryDir, { recursive: true });
    }
  }

  saveDocument(filename, content) {
    const filePath = path.join(this.libraryDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`[DocumentManager] Saved document: ${filename}`);
  }

  listDocuments() {
    return fs.readdirSync(this.libraryDir);
  }

  getDocument(filename) {
    const filePath = path.join(this.libraryDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }
}

module.exports = new DocumentManager();
