const express = require('express');
const path = require('path');

const app = express();
app.use(express.static('public'));

app.get('/health', (_req, res) => res.send('ok'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Web server running on http://localhost:${port}`));