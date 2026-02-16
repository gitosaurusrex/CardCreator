import { db } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    let client;
    try {
        // 1. Verify Authentication
        let userId;
        try {
            const auth = getAuth(req);
            userId = auth.userId;
        } catch (authError) {
            console.error("Auth Error:", authError);
            return res.status(401).json({ error: "Authentication failed", details: authError.message });
        }

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized. Please sign in." });
        }

        // 2. Connect to DB
        try {
            client = await db.connect();
        } catch (dbError) {
            console.error("DB Connection Error:", dbError);
            return res.status(500).json({ error: "Database connection failed", details: dbError.message });
        }

        // 3. Ensure table exists
        await client.sql`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cards JSONB NOT NULL,
                export_name TEXT,
                last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 4. GET: List only current user's projects
        if (req.method === 'GET') {
            const { rows } = await client.sql`
                SELECT * FROM projects 
                WHERE user_id = ${userId} 
                ORDER BY last_modified DESC
            `;

            const formattedRows = rows.map(r => ({
                id: r.id,
                name: r.name,
                cards: typeof r.cards === 'string' ? JSON.parse(r.cards) : r.cards,
                lastModified: r.last_modified
            }));
            return res.status(200).json(formattedRows);
        }

        // 5. POST: Save/Update with ownership check
        if (req.method === 'POST') {
            const { id, name, cards } = req.body;
            if (!id || !name || !cards) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // Upsert only if user_id matches or it's a new row
            // We stringify cards explicitly to ensure pg handles it as JSONB properly
            const cardsJson = JSON.stringify(cards);

            await client.sql`
                INSERT INTO projects (id, user_id, name, cards, export_name, last_modified)
                VALUES (${id.toString()}, ${userId}, ${name}, ${cardsJson}, NULL, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    cards = EXCLUDED.cards,
                    last_modified = NOW()
                WHERE projects.user_id = ${userId}
            `;
            return res.status(200).json({ success: true });
        }

        // 6. DELETE: Remove only own project
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: "Missing ID" });

            await client.sql`
                DELETE FROM projects 
                WHERE id = ${id} AND user_id = ${userId}
            `;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error("Handler Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (client) client.release();
    }
}
