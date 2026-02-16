import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    try {
        // 1. Verify Authentication
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized. Please sign in." });
        }

        // 2. Ensure table exists
        await sql`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cards JSONB NOT NULL,
                export_name TEXT,
                last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 3. GET: List only current user's projects
        if (req.method === 'GET') {
            const { rows } = await sql`
                SELECT * FROM projects 
                WHERE user_id = ${userId} 
                ORDER BY last_modified DESC
            `;

            const formattedRows = rows.map(r => ({
                id: r.id,
                name: r.name,
                cards: r.cards,
                lastModified: r.last_modified
            }));
            return res.status(200).json(formattedRows);
        }

        // 4. POST: Save/Update with ownership check
        if (req.method === 'POST') {
            const { id, name, cards } = req.body;
            if (!id || !name || !cards) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // Upsert only if user_id matches or it's a new row
            // Note: @vercel/postgres handles object serialization for JSONB automatically
            await sql`
                INSERT INTO projects (id, user_id, name, cards, export_name, last_modified)
                VALUES (${id.toString()}, ${userId}, ${name}, ${cards}, NULL, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    cards = EXCLUDED.cards,
                    last_modified = NOW()
                WHERE projects.user_id = ${userId}
            `;
            return res.status(200).json({ success: true });
        }

        // 5. DELETE: Remove only own project
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: "Missing ID" });

            await sql`
                DELETE FROM projects 
                WHERE id = ${id} AND user_id = ${userId}
            `;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}
