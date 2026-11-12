
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  throw new Error("ADMIN_PASSWORD and SESSION_SECRET must be configured.");
}

app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: "1mb" }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "documents.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, "[]");
}

function readDocs() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveDocs(docs) {
  const temp = DB_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(docs, null, 2));
  fs.renameSync(temp, DB_FILE);
}

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Admin login required" });
  }
  next();
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const allowedExtensions = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".ppt", ".pptx", ".txt", ".jpg", ".jpeg", ".png"
];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  }
});

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "public")));

// Public document list
app.get("/api/documents", (req, res) => {
  res.json(readDocs());
});

// Admin login
app.post("/api/admin/login", (req, res, next) => {
  const password = req.body?.password;

  if (typeof password !== "string" ||
      !crypto.timingSafeEqual(
        Buffer.from(password.padEnd(256).slice(0, 256)),
        Buffer.from(ADMIN_PASSWORD.padEnd(256).slice(0, 256))
      ) ||
      password.length !== ADMIN_PASSWORD.length) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  req.session.regenerate(err => {
    if (err) return next(err);
    req.session.admin = true;
    res.json({ success: true });
  });
});

app.get("/api/admin/status", (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Admin upload
app.post("/api/admin/upload", requireAdmin, upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Select a document" });
  }

  const docs = readDocs();
  const doc = {
    id: crypto.randomUUID(),
    title: String(req.body.title || req.file.originalname).slice(0, 150),
    filename: req.file.originalname,
    url: "/uploads/" + req.file.filename,
    size: req.file.size,
    uploadedAt: new Date().toISOString()
  };

  docs.push(doc);
  saveDocs(docs);
  res.json({ success: true, document: doc });
});

// Admin delete
app.delete("/api/admin/documents/:id", requireAdmin, (req, res) => {
  const docs = readDocs();
  const doc = docs.find(d => d.id === req.params.id);

  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  const filename = path.basename(doc.url);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  saveDocs(docs.filter(d => d.id !== doc.id));
  res.json({ success: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Request failed" });
});

app.listen(PORT, () => {
  console.log("RTS COMPANY AUSTRALIA running on port " + PORT);
});
