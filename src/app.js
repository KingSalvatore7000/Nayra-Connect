const express = require('express');
const path = require('path');

const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public/
app.use(express.static(path.join(__dirname, '../public')));

// Routes
const authRoutes = require('./routes/auth');
const lawyersRoutes = require('./routes/lawyers');
const casesRoutes = require('./routes/cases');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/lawyers', lawyersRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Nayra Connect',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
