import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import certificatesRouter from './routes/certificates.js';

// Import database to initialize
import './config/database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files (PDF certificates)
app.use('/certificates', express.static(path.join(__dirname, '../public/certificates')));

// API Routes
app.use('/api/certificates', certificatesRouter);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Certificate Generator API is running',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'Certificate Generator API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            certificates: '/api/certificates',
            stats: '/api/certificates/stats'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path
    });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  🎓 Certificate Generator API Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ Server running on: http://localhost:${PORT}`);
    console.log(`  ✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  ✅ Frontend URL: ${FRONTEND_URL}`);
    console.log('');
    console.log('  📚 API Documentation:');
    console.log(`     GET    /api/health                - Health check`);
    console.log(`     GET    /api/certificates          - Get all certificates`);
    console.log(`     POST   /api/certificates          - Create certificate`);
    console.log(`     GET    /api/certificates/:id      - Get certificate by ID`);
    console.log(`     PUT    /api/certificates/:id      - Update certificate`);
    console.log(`     DELETE /api/certificates/:id      - Delete certificate`);
    console.log(`     POST   /api/certificates/:id/send-whatsapp - Send via WhatsApp`);
    console.log(`     GET    /api/certificates/:id/download - Download PDF`);
    console.log(`     GET    /api/certificates/stats    - Get statistics`);
    console.log('═══════════════════════════════════════════════');
    console.log('');
});

export default app;
