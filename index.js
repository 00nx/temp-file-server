const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

const UPLOAD_FOLDER = path.join(__dirname, 'upload');
const LINKS_FILE = path.join(__dirname, 'links.json');


if (!fs.existsSync(UPLOAD_FOLDER)) fs.mkdirSync(UPLOAD_FOLDER);
if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, JSON.stringify({}));

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
filename: (req, file, cb) => {
  const uniqueName = `${uuidv4()}-${file.originalname}`;
  cb(null, uniqueName);
}

});
const upload = multer({ storage });


app.post('/uploadfile', upload.any(), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const uploadedFile = req.files[0];
  const downloadId = uuidv4();
  const filePath = uploadedFile.path;

const loadLinks = () => {
  try {
    return JSON.parse(fs.readFileSync(LINKS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to read links.json:', err);
    return {};
  }
};

const saveLinks = (links) => {
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
};


  const downloadLink = `http://localhost:${port}/download/${downloadId}`;
  res.status(200).json({ downloadLink });
});


app.get('/download/:downloadId', (req, res) => {
  const { downloadId } = req.params;

  let links = {};
  try {
    links = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf-8'));
  } catch (e) {
    console.error("Failed to read links.json:", e);
    return res.status(500).send('Server error.');
  }

  const filePath = links[downloadId];
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('File not found.');
  }

  res.download(filePath, path.basename(filePath), (err) => {
    if (err) {
      console.error(`Error sending file: ${err}`);
      if (!res.headersSent) res.status(500).send('Error downloading file.');
    }
  });
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
