# Temp File Server

A simple **raw API** for uploading files and generating one-time download links.  
Built with **Node.js**, **Express**, and **Multer**.

---

## 🚀 Features

- 📁 Upload any file
- 🔗 Get a direct download link
- 🧩 Pure API — no frontend
- 🔒 Works locally or expose via `ngrok` / `cloudflared`

---

## 📦 Installation

**1️⃣ Clone the repo**

```bash
git clone https://github.com/yourusername/temp-file-server.git
cd temp-file-server
```
```bash
npm install
```
🏃‍♂️ Running locally
Start the server: 

```bash 
npm start
```
📤 Upload a file
Use cURL, Postman, or any client:

```bash
curl -F "file=@yourfile.txt" http://localhost:3000/uploadfile
```
📥 Download a file
Visit the link in your browser, or curl it:
```bash
curl -O http://localhost:3000/download/<id>
```

🌍 Expose your server (Windows)
1️⃣ Using ngrok

# Download [ngrok](https://ngrok.com/downloads/windows) & add to PATH 
```bash
ngrok http 3000
```
Copy the HTTPS forwarding link
Use it to upload or download files, e.g.
https://abc123.ngrok.io/uploadfile
