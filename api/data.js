import { Redis } from '@upstash/redis';

const KV_KEY = 'captable_data';

const DEFAULT_DATA = {
    totalAuthorized: 10000000,
    optionPool: 1500000,
    shareholders: [
        { name: 'Alice Johnson',  type: 'Founder',   shares: 3000000, investment: '$0' },
        { name: 'Bob Smith',      type: 'Founder',   shares: 2000000, investment: '$0' },
        { name: 'VC Fund I',      type: 'Investor',  shares: 1500000, investment: '$1,500,000' },
        { name: 'Angel Group',    type: 'Investor',  shares: 500000,  investment: '$250,000' },
        { name: 'Carol Davis',    type: 'Options',   shares: 350000,  investment: '$0' },
        { name: 'Dan Lee',        type: 'Employee',  shares: 150000,  investment: '$0' },
    ]
};

function getRedis() {
    const url = process.env.KV_REST_API_URL || process.env.REDIS_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const redis = getRedis();

    if (!redis) {
        if (req.method === 'GET') {
            return res.status(200).json(DEFAULT_DATA);
        }
        // Debug: show which env vars exist
        const envKeys = Object.keys(process.env).filter(k =>
            k.includes('REDIS') || k.includes('KV') || k.includes('UPSTASH')
        );
        return res.status(503).json({
            error: 'Redis not connected',
            availableEnvKeys: envKeys
        });
    }

    try {
        if (req.method === 'GET') {
            const data = await redis.get(KV_KEY);
            return res.status(200).json(data || DEFAULT_DATA);
        }

        if (req.method === 'POST') {
            const body = req.body;
            if (!body || !Array.isArray(body.shareholders)) {
                return res.status(400).json({ error: 'Invalid data' });
            }
            await redis.set(KV_KEY, JSON.stringify(body));
            return res.status(200).json({ ok: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Redis error:', err);
        const envKeys = Object.keys(process.env).filter(k =>
            k.includes('REDIS') || k.includes('KV') || k.includes('UPSTASH')
        );
        res.status(500).json({ error: err.message, availableEnvKeys: envKeys });
    }
}
