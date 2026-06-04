import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db.js';

const router = express.Router();

// Get Signatures for a Document
router.get('/:docId', authMiddleware, async (req, res) => {
  try {
    const list = await db.signatures.listByDocId(req.params.docId);
    res.json(list);
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('Save signature error:', error);
    res.status(500).json({ error: error.message || 'Failed to save signature position.' });
  }
});

export default router;
