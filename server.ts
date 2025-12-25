import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import os from 'os';

const app = express();
// The hosting platform provides the port to listen on via the PORT environment variable.
// Default to 8080 for local development.
const port: number = parseInt(process.env.PORT || '8081', 10);

// FIRST: Serve the pitch-perfector2 app - this must come before catch-all
// Point to the dist folder where the built files are
app.use('/pitch-perfector2', express.static(path.join(__dirname, 'pitch-perfector2', 'dist'), {
    setHeaders: (res: Response, filepath: string) => {
        // Ensure correct MIME types for JS modules
        if (filepath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filepath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
    }
}));

// SECOND: Serve all other static files from the root directory
const publicPath = path.join(__dirname);
app.use(express.static(publicPath));

// LAST: For any other request (NOT pitch-perfector), send the index.html file.
// This is necessary for a Single Page Application (SPA).
app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip catch-all for pitch-perfector paths
    if (req.path.startsWith('/pitch-perfector2/')) {
        return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🎤 VoxLab Server Running!\n`);
    console.log(`   Local:    http://localhost:${port}`);

    // Try to get local IP address
    const networkInterfaces = os.networkInterfaces();
    let localIP: string | null = null;

    Object.keys(networkInterfaces).forEach((interfaceName: string) => {
        const interfaces = networkInterfaces[interfaceName];
        if (interfaces) {
            interfaces.forEach((iface) => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIP = iface.address;
                }
            });
        }
    });

    if (localIP) {
        console.log(`   Network:  http://${localIP}:${port}`);
        console.log(`\n📱 Access from your phone using the Network URL above`);
    }
    console.log(`\n`);
});