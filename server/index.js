require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { startReservationExpiryJob } = require('./jobs/reservationExpiry');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const patientRoutes = require('./routes/patient');
const hospitalAdminRoutes = require('./routes/hospitalAdmin');
const driverRoutes = require('./routes/driver');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH'],
  },
});

app.set('io', io);
initSocket(io);
startReservationExpiryJob(io);

connectDB();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/hospital', hospitalAdminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api', patientRoutes);

// Serve static assets from the React client build in production
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// React Router SPA fallback for all other routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Static client assets not built. Please run "npm run build" in the client directory.');
    }
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

