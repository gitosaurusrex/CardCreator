import { sql } from '@vercel/postgres';
import { createClerkClient } from '@clerk/backend';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
        if (!secretKey) {
            return res.status(500).send(JSON.stringify({ error: "Configuration Error", details: "Clerk Key missing" }));
        }

        const clerkClient = createClerkClient({ secretKey });

        // Build the absolute URL to satisfy Clerk's parser
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const hostname = req.headers['host'];
        const absoluteUrl = `${protocol}://${hostname}${req.url}`;

        const requestState = await clerkClient.authenticateRequest(req, {
            request: {
                url: absoluteUrl,
                headers: req.headers,
                method: req.method
            }
        });

        const userId = requestState.isSignedIn ? requestState.toAuth().userId : null;

        if (!userId) {
            return res.status(401).send(JSON.stringify({ error: "Unauthorized" }));
        }

        if (req.method === 'GET') {
            const { rows } = await sql`
                SELECT id, name, cards, last_modified FROM projects 
                WHERE user_id = ${userId} 
                ORDER BY last_modified DESC
            `;
            const formatted = rows.map(r => ({
                id: r.id,
                name: r.name,
                cards: typeof r.cards === 'string' ? JSON.parse(r.cards) : r.cards,
                lastModified: r.last_modified
            }));
            return res.status(200).send(JSON.stringify(formatted));
        }

        if (req.method === 'POST') {
            const { id, name, cards } = req.body;
            if (!id || !name || !cards) {
                return res.status(400).send(JSON.stringify({ error: "Missing required fields" }));
            }
            await sql`
                INSERT INTO projects (id, user_id, name, cards, last_modified)
                VALUES (${id}, ${userId}, ${name}, ${JSON.stringify(cards)}, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    cards = EXCLUDED.cards,
                    last_modified = NOW()
                WHERE projects.user_id = ${userId}
            `;
            return res.status(200).send(JSON.stringify({ success: true }));
        }

        return res.status(405).send(JSON.stringify({ error: "Method not allowed" }));
    } catch (error) {
        console.error("Projects API Error:", error);
        return res.status(500).send(JSON.stringify({
            error: "Internal Server Error",
            message: error.message
        }));
    }
}
