import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { authMiddleware } from '../middleware/auth.js';
import { db, isSupabaseConfigured, supabase } from '../db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer in-memory configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload Document API
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const originalName = req.file.originalname;
    const cleanFileName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueFileName = `${Date.now()}_${cleanFileName}`;

    let filePath = '';

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFileName, req.file.buffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return res.status(500).json({ error: 'Failed to upload file to cloud storage.' });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFileName);
      
      filePath = urlData.publicUrl;
    } else {
      // Save locally to backend/uploads
      const localPath = path.join(UPLOADS_DIR, uniqueFileName);
      fs.writeFileSync(localPath, req.file.buffer);
      filePath = `/uploads/${uniqueFileName}`;
    }

    // Save record to DB
    const doc = await db.documents.create({
      name: originalName,
      filePath,
      ownerId: req.user.id,
      status: 'Pending'
    });

    // Log the audit trail action
    await db.auditLogs.create({
      documentId: doc.id,
      action: 'Uploaded Document',
      userEmail: req.user.email,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: doc
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message || 'Something went wrong during file upload.' });
  }
});

// List User's Documents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await db.documents.listByOwner(req.user.id);
    res.json(list);
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: error.message || 'Failed to list documents.' });
  }
});

// Get Document Details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.documents.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    
    // Check ownership
    if (doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this document.' });
    }

    res.json(doc);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve document.' });
  }
});

// Get PDF Dimensions
router.get('/:id/dimensions', authMiddleware, async (req, res) => {
  try {
    const doc = await db.documents.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Check ownership
    if (doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this document.' });
    }

    let pdfBytes;
    const documentFileName = path.basename(doc.file_path);

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(documentFileName);

      if (error) {
        console.error('Supabase download error:', error);
        return res.status(500).json({ error: 'Failed to download PDF.' });
      }
      pdfBytes = await data.arrayBuffer();
    } else {
      const localPath = path.join(UPLOADS_DIR, documentFileName);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'PDF file not found.' });
      }
      pdfBytes = fs.readFileSync(localPath);
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return res.status(400).json({ error: 'PDF has no pages.' });
    }

    const { width, height } = pages[0].getSize();
    res.json({ width, height });
  } catch (error) {
    console.error('Get PDF dimensions error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze PDF.' });
  }
});

export default router;
