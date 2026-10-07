import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'transitlk';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

let db;

// Connect to MongoDB
MongoClient.connect(MONGODB_URI)
  .then(client => {
    db = client.db(MONGODB_DB);
    console.log('📦 Connected to MongoDB');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TransitLK Backend is running' });
});

// ==========================================
// PAYMENT CRUD OPERATIONS
// ==========================================

// 1. CREATE - අලුත් Payment එකක් add කරන්න (POST)
app.post('/api/payments/process', async (req, res) => {
  try {
    const { amount, method, details } = req.body;
    
    const ticketId = `TKT${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const transactionId = `TXN${Date.now()}`;
    const verificationCode = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit code
    
    const newPayment = {
      amount,
      method,
      details,
      ticketId,
      transactionId,
      verificationCode,
      status: 'Completed',
      date: new Date()
    };

    if (db) {
      const result = await db.collection('payments').insertOne(newPayment);
      newPayment._id = result.insertedId;
    }
    
    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: newPayment,
      qrData: JSON.stringify({ ticketId, verificationCode, amount, date: newPayment.date.toISOString() })
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing payment', error: error.message });
  }
});

// 2. READ ALL - ඔක්කොම Payments බලාගන්න (GET)
app.get('/api/payments', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, message: 'Database not connected' });
    
    const payments = await db.collection('payments').find().sort({ date: -1 }).toArray();
    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching payments', error: error.message });
  }
});

// 3. READ ONE - එක Payment එකක විස්තර බලාගන්න (GET)
app.get('/api/payments/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, message: 'Database not connected' });
    
    const payment = await db.collection('payments').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching payment', error: error.message });
  }
});

// 4. UPDATE - Payment එකක් update කරන්න (PUT)
app.put('/api/payments/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, message: 'Database not connected' });
    
    const updateData = req.body;
    updateData.updatedAt = new Date(); // Update කරපු වෙලාව

    const result = await db.collection('payments').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData },
      { returnDocument: 'after' } // Update උනාට පස්සේ අලුත් data එක return කරන්න
    );

    if (!result) return res.status(404).json({ success: false, message: 'Payment not found' });

    res.json({ success: true, message: 'Payment updated successfully', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating payment', error: error.message });
  }
});

// 5. DELETE - Payment එකක් අයින් කරන්න (DELETE)
app.delete('/api/payments/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, message: 'Database not connected' });

    const result = await db.collection('payments').deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Payment not found' });

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting payment', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TransitLK Backend Server running on http://localhost:${PORT}`);
});
