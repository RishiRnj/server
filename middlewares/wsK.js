// middleware/wsK.js

module.exports = (app, wss) => {
    app.use((req, res, next) => {
        req.wss = wss;  // Attaching the WebSocket server to every request
        next();
    });
};
