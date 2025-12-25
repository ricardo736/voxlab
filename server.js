"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const app = (0, express_1.default)();
// The hosting platform provides the port to listen on via the PORT environment variable.
// Default to 8080 for local development.
const port = parseInt(process.env.PORT || '8081', 10);
// Configure MIME types for video files
// @ts-expect-error - mime property exists but not in types
express_1.default.static.mime.define({
    'video/quicktime': ['mov'],
    'video/mp4': ['mp4']
});
// FIRST: Serve the pitch-perfector2 app - this must come before catch-all
// Point to the dist folder where the built files are
app.use('/pitch-perfector2', express_1.default.static(path_1.default.join(__dirname, 'pitch-perfector2', 'dist'), {
    setHeaders: (res, filepath) => {
        // Ensure correct MIME types for JS modules
        if (filepath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
        else if (filepath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
    }
}));
// SECOND: Serve all other static files from the root directory
const publicPath = path_1.default.join(__dirname);
app.use(express_1.default.static(publicPath));
// LAST: For any other request (NOT pitch-perfector), send the index.html file.
// This is necessary for a Single Page Application (SPA).
// Note: In production, rate limiting is handled by the hosting platform (e.g., Netlify, Vercel)
app.get('*', (req, res, next) => {
    // Skip catch-all for pitch-perfector paths
    if (req.path.startsWith('/pitch-perfector2/')) {
        return next();
    }
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
app.listen(port, '0.0.0.0', () => {
    console.log(`\n🎤 VoxLab Server Running!\n`);
    console.log(`   Local:    http://localhost:${port}`);
    // Try to get local IP address
    const networkInterfaces = os_1.default.networkInterfaces();
    let localIP = null;
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName]?.forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
            }
        });
    });
    if (localIP) {
        console.log(`   Network:  http://${localIP}:${port}`);
        console.log(`\n📱 Access from your phone using the Network URL above`);
    }
    console.log(`\n`);
});
