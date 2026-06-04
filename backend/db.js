import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

// Local JSON File Database Configuration
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (table) => path.join(DATA_DIR, `${table}.json`);

const readLocalData = (table) => {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading local table ${table}:`, error);
    return [];
  }
};

const writeLocalData = (table, data) => {
  const filePath = getFilePath(table);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing local table ${table}:`, error);
  }
};

// Database interfaces
export const db = {
  users: {
    async findByEmail(email) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const users = readLocalData('users');
        return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
      }
    },

    async findById(id) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const users = readLocalData('users');
        return users.find(u => u.id === id) || null;
      }
    },

    async create({ name, email, passwordHash }) {
      const newUser = {
        id: isSupabaseConfigured ? undefined : `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email: email.toLowerCase(),
        password: passwordHash,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const users = readLocalData('users');
        users.push(newUser);
        writeLocalData('users', users);
        return newUser;
      }
    }
  },

  documents: {
    async create({ name, filePath, ownerId, status = 'Pending' }) {
      const newDoc = {
        id: isSupabaseConfigured ? undefined : `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        file_path: filePath,
        owner_id: ownerId,
        status,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('documents')
          .insert([newDoc])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const docs = readLocalData('documents');
        docs.push(newDoc);
        writeLocalData('documents', docs);
        return newDoc;
      }
    },

    async listByOwner(ownerId) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      } else {
        const docs = readLocalData('documents');
        return docs.filter(d => d.owner_id === ownerId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    },

    async findById(id) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const docs = readLocalData('documents');
        return docs.find(d => d.id === id) || null;
      }
    },

    async updateStatus(id, status) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('documents')
          .update({ status })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const docs = readLocalData('documents');
        const docIndex = docs.findIndex(d => d.id === id);
        if (docIndex === -1) return null;
        docs[docIndex].status = status;
        writeLocalData('documents', docs);
        return docs[docIndex];
      }
    }
  },

  signatures: {
    async create({ documentId, userId = null, x, y, page = 1, status = 'Pending', signerEmail = '', reason = '' }) {
      const newSig = {
        id: isSupabaseConfigured ? undefined : `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        document_id: documentId,
        user_id: userId,
        x: parseFloat(x),
        y: parseFloat(y),
        page: parseInt(page, 10),
        status,
        signer_email: signerEmail.toLowerCase(),
        reason,
        signed_at: status === 'Signed' ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('signatures')
          .insert([newSig])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const sigs = readLocalData('signatures');
        sigs.push(newSig);
        writeLocalData('signatures', sigs);
        return newSig;
      }
    },

    async listByDocId(documentId) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('signatures')
          .select('*')
          .eq('document_id', documentId);
        if (error) throw error;
        return data || [];
      } else {
        const sigs = readLocalData('signatures');
        return sigs.filter(s => s.document_id === documentId);
      }
    },

    async findById(id) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('signatures')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const sigs = readLocalData('signatures');
        return sigs.find(s => s.id === id) || null;
      }
    },

    async updateStatus(id, { status, reason = '', signedAt = null }) {
      const updateData = { status, reason };
      if (signedAt) updateData.signed_at = signedAt;

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('signatures')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const sigs = readLocalData('signatures');
        const sigIndex = sigs.findIndex(s => s.id === id);
        if (sigIndex === -1) return null;
        sigs[sigIndex] = { ...sigs[sigIndex], ...updateData };
        writeLocalData('signatures', sigs);
        return sigs[sigIndex];
      }
    }
  },

  auditLogs: {
    async create({ documentId, action, userEmail = 'system', ipAddress = '127.0.0.1', userAgent = '' }) {
      const newLog = {
        id: isSupabaseConfigured ? undefined : `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        document_id: documentId,
        action,
        user_email: userEmail.toLowerCase(),
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('audit_logs')
          .insert([newLog])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const logs = readLocalData('audit_logs');
        logs.push(newLog);
        writeLocalData('audit_logs', logs);
        return newLog;
      }
    },

    async listByDocId(documentId) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
      } else {
        const logs = readLocalData('audit_logs');
        return logs.filter(l => l.document_id === documentId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }
    }
  }
};
