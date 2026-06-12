import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db.js';

const router = express.Router();

// Get Audit Trail for a Document
router.get('/:docId', authMiddleware, async (req, res) => {
  try {
    const { docId } = req.params;

    // Verify document exists and belongs to user
    const doc = await db.documents.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this document\'s audit logs.' });
    }

    const logs = await db.auditLogs.listByDocId(docId);
    res.json(logs);
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve audit logs.' });
  }
});

export default router;
