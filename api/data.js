import { kv } from '@vercel/kv';

const KV_KEY = 'captable_data';

const DEFAULT_DATA = {
    totalAuthorized: 10000000,
    optionPool: 1500000,
    shareholders: [
        { name: 'Alice Johnson (Founder)',  type: 'Common',         shares: 3000000, investment: '$0' },
        { name: 'Bob Smith (Founder)',      type: 'Common',         shares: 2000000, investment: '$0' },
        { name: 'Venture Capital Fund I',   type: 'Preferred A',    shares: 1500000, investment: '$1,500,000' },
        { name: 'Angel Investor Group',     type: 'Preferred Seed', shares: 500000,  investment: '$250,000' },
        { name: 'Carol Davis (Employee)',   type: 'Option',         shares: 350000,  investment: '$0' },
        { name: 'Dan Lee (Employee)',       type: 'Option',         shares: 150000,  investment: '$0' },
    ]
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const data = await kv.get(KV_KEY);
            return res.status(200).json(data || DEFAULT_DATA);
        }

        if (req.method === 'POST') {
            const body = req.body;
            if (!body || !Array.isArray(body.shareholders)) {
                return res.status(400).json({ error: 'Invalid data' });
            }
            await kv.set(KV_KEY, body);
            return res.status(200).json({ ok: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('KV error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
