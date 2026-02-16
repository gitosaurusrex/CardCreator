import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    // Set JSON header immediately
    res.setHeader('Content-Type', 'application/json');

    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).send(JSON.stringify({ error: "Unauthorized" }));
        }

        if (req.method === 'GET') {
            const { rows } = await sql`
                SELECT id, name, cards, last_modified FROM projects 
                WHERE user_id = ${userId} 
                ORDER BY last_modified DESC
            `;
            return res.status(200).send(JSON.stringify(rows));
        }

        if (req.method === 'POST') {
            const { id, name, cards } = req.body;
            if (!id || !name || !cards) {
                return res.status(400).send(JSON.stringify({ error: "Missing fields" }));
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
        console.error("API Error:", error);
        return res.status(500).send(JSON.stringify({
            error: "Server Error",
            message: error.message
        }));
    }
}
