import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
  } catch (error: any) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message || 'Something went wrong during file upload.' });
  }
});

export default router;
