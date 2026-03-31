import Redis from 'ioredis';

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

let redis;

function getRedis() {
    if (!process.env.REDIS_URL) return null;
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true,
        });
    }
    return redis;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const client = getRedis();

    if (!client) {
        if (req.method === 'GET') return res.status(200).json(DEFAULT_DATA);
        return res.status(503).json({ error: 'REDIS_URL not set' });
    }

    try {
        await client.connect().catch(() => {});

        if (req.method === 'GET') {
            const raw = await client.get(KV_KEY);
            const data = raw ? JSON.parse(raw) : null;
            return res.status(200).json(data || DEFAULT_DATA);
        }

        if (req.method === 'POST') {
            const body = req.body;
            if (!body || !Array.isArray(body.shareholders)) {
                return res.status(400).json({ error: 'Invalid data' });
            }
            await client.set(KV_KEY, JSON.stringify(body));
            return res.status(200).json({ ok: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Redis error:', err);
        res.status(500).json({ error: err.message });
    }
}
