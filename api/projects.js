import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        // Clerk SDK v4 sometimes strictly looks for CLERK_API_KEY or CLERK_SECRET_KEY
        // We ensure the process environment has what it needs
        if (!process.env.CLERK_SECRET_KEY && process.env.CLERK_API_KEY) {
            process.env.CLERK_SECRET_KEY = process.env.CLERK_API_KEY;
        } else if (process.env.CLERK_SECRET_KEY && !process.env.CLERK_API_KEY) {
            process.env.CLERK_API_KEY = process.env.CLERK_SECRET_KEY;
        }

        let userId;
        try {
            const auth = getAuth(req);
            userId = auth?.userId;
        } catch (clerkError) {
            console.error("Clerk getAuth error:", clerkError);
            // Fallback: If getAuth crashes, try to see if it's a configuration issue
            return res.status(401).send(JSON.stringify({
                error: "Authentication Error",
                message: clerkError.message
            }));
        }

        if (!userId) {
            return res.status(401).send(JSON.stringify({ error: "Unauthorized - No Session Found" }));
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

            const cardsJson = JSON.stringify(cards);
            await sql`
                INSERT INTO projects (id, user_id, name, cards, last_modified)
                VALUES (${id}, ${userId}, ${name}, ${cardsJson}, NOW())
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
        console.error("Projects API Global Error:", error);
        return res.status(500).send(JSON.stringify({
            error: "Internal Server Error",
            message: error.message
        }));
    }
}
