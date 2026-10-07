const express = require('express');
const client = require('prom-client');
const os = require('os');

const app = express();
client.collectDefaultMetrics();

const requests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['route'],
});

app.get('/', (req, res) => {
  requests.inc({ route: '/' });
  res.json({ pod: os.hostname(), version: process.env.APP_VERSION || 'v3' });
});

// endpoint pembakar CPU (~100ms) untuk menguji autoscaling
app.get('/work', (req, res) => {
  requests.inc({ route: '/work' });
  const end = Date.now() + 100;
  while (Date.now() < end) { Math.sqrt(Math.random()); }
  res.json({ pod: os.hostname(), done: true });
});

app.get('/health', (req, res) => res.send('ok'));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

const server = app.listen(3000, () => console.log('running on 3000'));

// graceful shutdown: selesaikan request berjalan sebelum pod mati
process.on('SIGTERM', () => server.close(() => process.exit(0)));