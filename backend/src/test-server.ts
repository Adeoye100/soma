// Simple test server to verify backend works
import express from 'express';

const app = express();
const port = 3001;

app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running!' });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Test backend server running on http://localhost:${port}`);
});