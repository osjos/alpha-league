const express = require('express');
const path = require('path');

const app = express();
app.use(express.static('public'));

app.get('/health', (_req, res) => res.send('ok'));

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => console.log(`Web server running on http://0.0.0.0:${port}`));