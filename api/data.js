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
    // Try every possible env var combination Vercel might use
    const urlCandidates = [
        process.env.KV_REST_API_URL,
        process.env.REDIS_REST_API_URL,
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.REDIS_URL,
    ];
    const tokenCandidates = [
        process.env.KV_REST_API_TOKEN,
        process.env.REDIS_REST_API_TOKEN,
        process.env.UPSTASH_REDIS_REST_TOKEN,
        process.env.REDIS_TOKEN,
    ];

    const url = urlCandidates.find(v => v);
    const token = tokenCandidates.find(v => v);

    if (url && token) {
        return new Redis({ url, token });
    }

    // If only URL exists, try fromEnv as last resort
    try {
        return Redis.fromEnv();
    } catch (e) {}

    return null;
}

// Debug helper
function getRedisEnvKeys() {
    return Object.keys(process.env).filter(k =>
        k.includes('REDIS') || k.includes('KV') || k.includes('UPSTASH')
    );
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
        return res.status(503).json({
            error: 'Redis not connected — no valid URL+TOKEN pair found',
            availableEnvKeys: getRedisEnvKeys()
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
        res.status(500).json({
            error: err.message,
            availableEnvKeys: getRedisEnvKeys()
        });
    }
}
