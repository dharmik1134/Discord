// Vercel Serverless Function for WebRTC Peer Signaling
// Handles /api/signal (POST) and /api/signals (GET)

const roomSignals = {};

export default function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const body = req.body || {};
        const room = body.room || 'default';

        if (!roomSignals[room]) {
            roomSignals[room] = [];
        }

        roomSignals[room].push(body);
        if (roomSignals[room].length > 50) {
            roomSignals[room].shift();
        }

        return res.status(200).json({ status: 'ok' });
    }

    if (req.method === 'GET') {
        const room = req.query.room || 'default';
        const since = parseInt(req.query.since || '0', 10);
        const signals = roomSignals[room] || [];
        const newSignals = since < signals.length ? signals.slice(since) : [];

        return res.status(200).json({ signals: newSignals, count: signals.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
