const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; 
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

const UPLOAD_FOLDER = path.join(__dirname, 'uploads'); 
const LINKS_FILE = path.join(__dirname, 'links.json');

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit (adjust as needed)
const ALLOWED_MIME_TYPES = null; 

(async () => {
  await fs.mkdir(UPLOAD_FOLDER, { recursive: true });
  try {
    await fs.access(LINKS_FILE);
  } catch {
    await fs.writeFile(LINKS_FILE, JSON.stringify({}));
  }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_FOLDER),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = uuidv4() + ext;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES || ALLOWED_MIME_TYPES.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

let linksCache = {};
let cacheDirty = false;

async function loadLinks() {
  try {
    const data = await fs.readFile(LINKS_FILE, 'utf-8');
    linksCache = JSON.parse(data);
  } catch (err) {
    console.error('Failed to load links.json, initializing empty:', err.message);
    linksCache = {};
  }
}

// Save links to disk (only if dirty)
async function saveLinksIfDirty() {
  if (cacheDirty) {
    try {
      await fs.writeFile(LINKS_FILE, JSON.stringify(linksCache, null, 2));
      cacheDirty = false;
    } catch (err) {
      console.error('Failed to save links.json:', err);
    }
  }
}

setInterval(saveLinksIfDirty, 10000);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down... Saving links...');
  await saveLinksIfDirty();
  process.exit(0);
});

// Initialize cache
loadLinks();

// Upload route
app.post('/uploadfile', upload.single('file'), async (req, res) => {
  // Changed to .single('file') — more explicit and common pattern
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const downloadId = uuidv4();
  const filePath = req.file.path;

  linksCache[downloadId] = filePath;
  cacheDirty = true;

  const downloadLink = `http://localhost:${port}/download/${downloadId}`;
  res.status(200).json({ downloadLink });
});

// Download route (one-time link)
app.get('/download/:downloadId', async (req, res) => {
  const { downloadId } = req.params;
  const filePath = linksCache[downloadId];

  if (!filePath || !(await fs.stat(filePath).catch(() => false))) {
    delete linksCache[downloadId]; // Clean up stale entry
    cacheDirty = true;
    return res.status(404).send('File not found or link expired.');
  }

  // Set filename for download
  const filename = path.basename(filePath);

  res.download(filePath, filename, async (err) => {
    if (err) {
      console.error(`Download error for ${downloadId}:`, err);
      // Don't delete on client cancel/error to allow retry
      if (!res.headersSent) {
        res.status(500).send('Download failed.');
      }
      return;
    }

    // Successful download → delete file and link
    await fs.unlink(filePath).catch(unlinkErr => {
      console.warn(`Failed to delete file ${filePath}:`, unlinkErr.message);
    });

    delete linksCache[downloadId];
    cacheDirty = true;
  });
});

// Optional: Serve a simple upload form for testing
app.get('/', (req, res) => {
  res.send(`
    <h2>File Upload (One-time Download Link)</h2>
    <form action="/uploadfile" method="POST" enctype="multipart/form-data">
      <input type="file" name="file" required /><br><br>
      <button type="submit">Upload</button>
    </form>
  `);
});

app.listen(port, () => {
  console.log(`Secure one-time file share server running at http://localhost:${port}`);
});

