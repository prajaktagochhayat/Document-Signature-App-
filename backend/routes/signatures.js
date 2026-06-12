import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import { db, isSupabaseConfigured, supabase } from '../db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Get Signatures for a Document
router.get('/:docId', authMiddleware, async (req, res) => {
  try {
    const list = await db.signatures.listByDocId(req.params.docId);
    res.json(list);
  } catch (error) {
    console.error('List signatures error:', error);
    res.status(500).json({ error: error.message || 'Failed to list signatures.' });
  }
});

// Save Signature Positions
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { documentId, x, y, page, signerEmail } = req.body;

    if (!documentId || x === undefined || y === undefined || !signerEmail) {
      return res.status(400).json({ error: 'Please provide documentId, coordinates (x, y), and signerEmail.' });
    }

    // Verify document exists and user is owner
    const doc = await db.documents.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to add signatures to this document.' });
    }

    // Create signature placeholder
    const signature = await db.signatures.create({
      documentId,
      x,
      y,
      page: page || 1,
      status: 'Pending',
      signerEmail
    });

    // Log the audit trail action
    await db.auditLogs.create({
      documentId,
      action: `Placed signature placeholder for ${signerEmail.toLowerCase()} on page ${page || 1}`,
      userEmail: req.user.email,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json({
      message: 'Signature placeholder saved successfully',
      signature
    });
  } catch (error) {
    console.error('Save signature error:', error);
    res.status(500).json({ error: error.message || 'Failed to save signature position.' });
  }
});

// Finalize Document & Embed Signatures via PDF-Lib
router.post('/finalize', authMiddleware, async (req, res) => {
  try {
    const { documentId, signatureImageBase64 } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Please provide documentId.' });
    }

    // 1. Fetch document details
    const doc = await db.documents.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // 2. Fetch signature placeholders for this document
    const sigs = await db.signatures.listByDocId(documentId);
    if (sigs.length === 0) {
      return res.status(400).json({ error: 'No signature positions placed on this document.' });
    }

    // 3. Load PDF bytes
    let pdfBytes;
    const documentFileName = path.basename(doc.file_path);

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(documentFileName);

      if (error) {
        console.error('Supabase download error:', error);
        return res.status(500).json({ error: 'Failed to download original PDF from storage.' });
      }
      pdfBytes = await data.arrayBuffer();
    } else {
      const localPath = path.join(UPLOADS_DIR, documentFileName);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Original PDF file not found on disk.' });
      }
      pdfBytes = fs.readFileSync(localPath);
    }

    // 4. Manipulate PDF using PDF-Lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const standardFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed signature drawing image if provided
    let embeddedImage;
    if (signatureImageBase64) {
      // Remove base64 data header if present
      const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, 'base64');
      embeddedImage = await pdfDoc.embedPng(imgBuffer);
    }

    // 5. Draw signatures onto PDF pages at coordinates
    for (const sig of sigs) {
      const targetPageNum = Math.min(sig.page - 1, pages.length - 1);
      const targetPage = pages[targetPageNum];
      const { width, height } = targetPage.getSize();

      // Convert percentage coordinates back to PDF points
      const xPos = (sig.x / 100) * width;
      // In PDF, Y goes from bottom to top. Our coordinate goes top to bottom.
      const yPos = height - ((sig.y / 100) * height) - 40;

      if (embeddedImage) {
        // Draw the visual base64 canvas signature
        targetPage.drawImage(embeddedImage, {
          x: xPos,
          y: yPos,
          width: 110,
          height: 35,
        });
      } else {
        // Fallback to text signature if no drawn signature is supplied
        targetPage.drawText(`Signed by: ${sig.signer_email}`, {
          x: xPos,
          y: yPos + 15,
          size: 9,
          font: standardFont,
          color: rgb(0.1, 0.4, 0.8),
        });
      }

      // Update signature status in database
      await db.signatures.updateStatus(sig.id, {
        status: 'Signed',
        signedAt: new Date().toISOString()
      });
    }

    // 6. Save modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    const finalizedFileName = `signed_${Date.now()}_${documentFileName}`;
    let finalizedFilePath = '';

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(finalizedFileName, modifiedPdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload signed PDF error:', error);
        return res.status(500).json({ error: 'Failed to upload finalized PDF.' });
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(finalizedFileName);

      finalizedFilePath = urlData.publicUrl;
    } else {
      const localSignedPath = path.join(UPLOADS_DIR, finalizedFileName);
      fs.writeFileSync(localSignedPath, modifiedPdfBytes);
      finalizedFilePath = `/uploads/${finalizedFileName}`;
    }

    // 7. Update document record status and path
    const updatedDoc = await db.documents.create({
      name: `signed_${doc.name}`,
      filePath: finalizedFilePath,
      ownerId: doc.owner_id,
      status: 'Signed'
    });

    // Mark original document as 'Signed'
    await db.documents.updateStatus(doc.id, 'Signed');

    // 8. Log the audit trail action
    await db.auditLogs.create({
      documentId: doc.id,
      action: 'Finalized and Compile Signed PDF',
      userEmail: req.user.email,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      message: 'Document finalized and signed successfully',
      signedDocument: updatedDoc,
      pdfUrl: finalizedFilePath
    });
  } catch (error) {
    console.error('Finalize document error:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize and sign PDF.' });
  }
});

// Self-Sign Document
router.post('/self-sign', authMiddleware, async (req, res) => {
  try {
    const { documentId, signatureImageBase64, x, y, page } = req.body;

    if (!documentId || !signatureImageBase64 || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Please provide documentId, signatureImageBase64, and coordinates (x, y).' });
    }

    const doc = await db.documents.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // 1. Create a signed signature record in database
    const sig = await db.signatures.create({
      documentId,
      userId: req.user.id,
      x,
      y,
      page: page || 1,
      status: 'Signed',
      signerEmail: req.user.email,
    });

    // 2. Load PDF bytes
    let pdfBytes;
    const documentFileName = path.basename(doc.file_path);

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(documentFileName);

      if (error) {
        console.error('Supabase download error:', error);
        return res.status(500).json({ error: 'Failed to download original PDF from storage.' });
      }
      pdfBytes = await data.arrayBuffer();
    } else {
      const localPath = path.join(UPLOADS_DIR, documentFileName);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Original PDF file not found on disk.' });
      }
      pdfBytes = fs.readFileSync(localPath);
    }

    // 3. Manipulate PDF using PDF-Lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Embed signature drawing image
    const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');
    const embeddedImage = await pdfDoc.embedPng(imgBuffer);

    // Draw signature
    const targetPageNum = Math.min((page || 1) - 1, pages.length - 1);
    const targetPage = pages[targetPageNum];
    const { width, height } = targetPage.getSize();

    const xPos = (x / 100) * width;
    const yPos = height - ((y / 100) * height) - 40;

    targetPage.drawImage(embeddedImage, {
      x: xPos,
      y: yPos,
      width: 110,
      height: 35,
    });

    // 4. Save modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    const finalizedFileName = `signed_${Date.now()}_${documentFileName}`;
    let finalizedFilePath = '';

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(finalizedFileName, modifiedPdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload signed PDF error:', error);
        return res.status(500).json({ error: 'Failed to upload finalized PDF.' });
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(finalizedFileName);

      finalizedFilePath = urlData.publicUrl;
    } else {
      const localSignedPath = path.join(UPLOADS_DIR, finalizedFileName);
      fs.writeFileSync(localSignedPath, modifiedPdfBytes);
      finalizedFilePath = `/uploads/${finalizedFileName}`;
    }

    // 5. Update document record status and path
    const updatedDoc = await db.documents.create({
      name: `signed_${doc.name}`,
      filePath: finalizedFilePath,
      ownerId: doc.owner_id,
      status: 'Signed'
    });

    // Mark original document as 'Signed'
    await db.documents.updateStatus(doc.id, 'Signed');

    // 6. Log the audit trail action
    await db.auditLogs.create({
      documentId: doc.id,
      action: 'Document Self-Signed and Finalized',
      userEmail: req.user.email,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      message: 'Document signed successfully',
      signedDocument: updatedDoc,
      pdfUrl: finalizedFilePath
    });
  } catch (error) {
    console.error('Self-sign document error:', error);
    res.status(500).json({ error: error.message || 'Failed to self-sign PDF.' });
  }
});

// Generate public tokenized link for signature request
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { signatureId, documentId, signerEmail } = req.body;
    
    let sig;
    let doc;
    
    if (signatureId) {
      sig = await db.signatures.findById(signatureId);
      if (!sig) {
        return res.status(404).json({ error: 'Signature field not found.' });
      }
      doc = await db.documents.findById(sig.document_id);
    } else {
      if (!documentId || !signerEmail) {
        return res.status(400).json({ error: 'Please provide signatureId or documentId and signerEmail.' });
      }
      doc = await db.documents.findById(documentId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }
      if (doc.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
      
      // Create new signature placeholder with default coordinates
      sig = await db.signatures.create({
        documentId,
        x: 50,
        y: 50,
        page: 1,
        status: 'Pending',
        signerEmail: signerEmail.toLowerCase()
      });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Associated document not found.' });
    }

    // Sign token with JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'super_cute_and_secure_jwt_secret_key_12345';
    const token = jwt.sign({ signatureId: sig.id, documentId: doc.id }, JWT_SECRET, { expiresIn: '7d' });

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${FRONTEND_URL}/sign/${token}`;

    console.log(`[Email Sent to ${sig.signer_email}]: Hey, you have been requested to sign document "${doc.name}". Click here: ${link}`);

    // Log the audit trail action
    await db.auditLogs.create({
      documentId: doc.id,
      action: `Sent signature request email to ${sig.signer_email}`,
      userEmail: req.user.email,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      message: 'Signature request generated',
      link,
      signerEmail: sig.signer_email
    });
  } catch (error) {
    console.error('Request signature error:', error);
    res.status(500).json({ error: error.message || 'Failed to create signature link.' });
  }
});


// Verify public tokenized link (used by Guest Signer)
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const JWT_SECRET = process.env.JWT_SECRET || 'super_cute_and_secure_jwt_secret_key_12345';

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: 'Signature token is invalid or has expired.' });
    }

    const sig = await db.signatures.findById(decoded.signatureId);
    if (!sig) {
      return res.status(404).json({ error: 'Signature placeholder no longer exists.' });
    }

    const doc = await db.documents.findById(decoded.documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Load PDF to get dimensions
    let pdfBytes;
    const documentFileName = path.basename(doc.file_path);
    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(documentFileName);
      if (!error) pdfBytes = await data.arrayBuffer();
    } else {
      const localPath = path.join(UPLOADS_DIR, documentFileName);
      if (fs.existsSync(localPath)) pdfBytes = fs.readFileSync(localPath);
    }

    let dimensions = { width: 612, height: 792 }; // fallback
    if (pdfBytes) {
      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        if (pages.length > 0) {
          const { width, height } = pages[0].getSize();
          dimensions = { width, height };
        }
      } catch (err) {
        console.error('Failed to parse PDF dimensions for guest', err);
      }
    }

    res.json({
      signature: sig,
      document: {
        id: doc.id,
        name: doc.name,
        file_path: doc.file_path,
        status: doc.status,
        dimensions
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: error.message || 'Verification failed.' });
  }
});

// Process Guest Signing Action
router.post('/guest-sign/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { signatureImageBase64, status, reason, x, y, page } = req.body; // status can be 'Signed' or 'Rejected'

    const JWT_SECRET = process.env.JWT_SECRET || 'super_cute_and_secure_jwt_secret_key_12345';

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired signature token.' });
    }

    const sig = await db.signatures.findById(decoded.signatureId);
    if (!sig) {
      return res.status(404).json({ error: 'Signature placeholder not found.' });
    }
    if (sig.status !== 'Pending') {
      return res.status(400).json({ error: `This document signature is already ${sig.status}.` });
    }

    const doc = await db.documents.findById(decoded.documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Associated document not found.' });
    }

    if (status === 'Rejected') {
      // 1. Update signature in database
      await db.signatures.updateStatus(sig.id, {
        status: 'Rejected',
        reason: reason || 'Rejected by signer'
      });

      // Update original document status to Rejected
      await db.documents.updateStatus(doc.id, 'Rejected');

      // 2. Log Audit Log
      await db.auditLogs.create({
        documentId: doc.id,
        action: `Signature Rejected by ${sig.signer_email}. Reason: ${reason || 'None provided'}`,
        userEmail: sig.signer_email,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || ''
      });

      return res.json({
        message: 'Signature request rejected',
        status: 'Rejected'
      });
    }

    // Otherwise: Process 'Signed' Status
    // We will draw the signature visual and compile the final PDF
    let pdfBytes;
    const documentFileName = path.basename(doc.file_path);

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(documentFileName);

      if (error) {
        console.error('Supabase download error:', error);
        return res.status(500).json({ error: 'Failed to download original PDF.' });
      }
      pdfBytes = await data.arrayBuffer();
    } else {
      const localPath = path.join(UPLOADS_DIR, documentFileName);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Original PDF file not found.' });
      }
      pdfBytes = fs.readFileSync(localPath);
    }

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const standardFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed Signature Image if provided
    let embeddedImage;
    if (signatureImageBase64) {
      const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, 'base64');
      embeddedImage = await pdfDoc.embedPng(imgBuffer);
    }

    // Draw on page
    const targetX = x !== undefined ? parseFloat(x) : sig.x;
    const targetY = y !== undefined ? parseFloat(y) : sig.y;
    const targetPageNumVal = page !== undefined ? parseInt(page, 10) : sig.page;

    const targetPageNum = Math.min(targetPageNumVal - 1, pages.length - 1);
    const targetPage = pages[targetPageNum];
    const { width, height } = targetPage.getSize();

    const xPos = (targetX / 100) * width;
    const yPos = height - ((targetY / 100) * height) - 40;

    if (embeddedImage) {
      targetPage.drawImage(embeddedImage, {
        x: xPos,
        y: yPos,
        width: 110,
        height: 35,
      });
    } else {
      targetPage.drawText(`Signed by: ${sig.signer_email}`, {
        x: xPos,
        y: yPos + 15,
        size: 9,
        font: standardFont,
        color: rgb(0.0, 0.0, 0.0),
      });
    }

    // Update signature status to Signed, updating coordinates as well
    await db.signatures.updateStatus(sig.id, {
      status: 'Signed',
      signedAt: new Date().toISOString(),
      x: targetX,
      y: targetY,
      page: targetPageNumVal
    });


    // Save modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    const finalizedFileName = `signed_${Date.now()}_${documentFileName}`;
    let finalizedFilePath = '';

    if (isSupabaseConfigured) {
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(finalizedFileName, modifiedPdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload signed PDF error:', error);
        return res.status(500).json({ error: 'Failed to upload finalized PDF.' });
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(finalizedFileName);

      finalizedFilePath = urlData.publicUrl;
    } else {
      const localSignedPath = path.join(UPLOADS_DIR, finalizedFileName);
      fs.writeFileSync(localSignedPath, modifiedPdfBytes);
      finalizedFilePath = `/uploads/${finalizedFileName}`;
    }

    // Save signed document record
    const updatedDoc = await db.documents.create({
      name: `signed_${doc.name}`,
      filePath: finalizedFilePath,
      ownerId: doc.owner_id,
      status: 'Signed'
    });

    // Mark original document as 'Signed'
    await db.documents.updateStatus(doc.id, 'Signed');

    // Create Audit Log
    await db.auditLogs.create({
      documentId: doc.id,
      action: `Document signed by guest ${sig.signer_email}`,
      userEmail: sig.signer_email,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      message: 'Document signed successfully by guest',
      status: 'Signed',
      pdfUrl: finalizedFilePath
    });
  } catch (error) {
    console.error('Guest signing error:', error);
    res.status(500).json({ error: error.message || 'Failed to sign document.' });
  }
});

export default router;
