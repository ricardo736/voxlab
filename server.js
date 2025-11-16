
const express = require('express');
const path = require('path');

const app = express();
// The hosting platform provides the port to listen on via the PORT environment variable.
// Default to 8080 for local development.
const port = process.env.PORT || 8080;

// Serve all the static files from the root directory.
const publicPath = path.join(__dirname);
app.use(express.static(publicPath));

// For any other request, send the index.html file.
// This is necessary for a Single Page Application (SPA).
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});