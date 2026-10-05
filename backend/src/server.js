import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TransitLK Backend is running' });
});

app.post('/api/payments/process', (req, res) => {
  const { amount, method, details } = req.body;
  
  // Mock payment processing
  console.log(`Processing ${method} payment for Rs. ${amount}...`);
  
  setTimeout(() => {
    // Generate a mock ticket ID
    const ticketId = `TKT${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    res.json({
      success: true,
      transactionId: `TXN${Date.now()}`,
      ticketId,
      amount,
      message: 'Payment processed successfully',
      qrData: JSON.stringify({ ticketId, amount, date: new Date().toISOString() })
    });
  }, 1500); // Simulate network delay
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TransitLK Backend Server running on http://localhost:${PORT}`);
});
