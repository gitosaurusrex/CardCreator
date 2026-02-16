import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    console.log(`[API/projects] Request: ${req.method}`);

    try {
        // 1. Verify Authentication
        let authState;
        try {
            authState = getAuth(req);
            if (!authState || !authState.userId) {
                console.error("[API/projects] No userId found in auth state");
                return res.status(401).json({ error: "Unauthorized. Please sign in." });
            }
        } catch (authError) {
            console.error("[API/projects] Clerk Auth Error:", authError);
            return res.status(401).json({ error: "Authentication failed", details: authError.message });
        }

        const userId = authState.userId;

        // 2. GET: List only current user's projects
        if (req.method === 'GET') {
            try {
                const { rows } = await sql`
                    SELECT id, name, cards, last_modified FROM projects 
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
            } catch (dbError) {
                console.error("[API/projects] DB GET Error:", dbError);
                return res.status(500).json({ error: "Database query failed", details: dbError.message });
            }
        }

        // 3. POST: Save/Update with ownership check
        if (req.method === 'POST') {
            const { id, name, cards } = req.body;
            if (!id || !name || !cards) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            try {
                const cardsJson = JSON.stringify(cards);
                await sql`
                    INSERT INTO projects (id, user_id, name, cards, export_name, last_modified)
                    VALUES (${id.toString()}, ${userId}, ${name}, ${cardsJson}, NULL, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        cards = EXCLUDED.cards,
                        last_modified = NOW()
                    WHERE projects.user_id = ${userId}
                `;
                return res.status(200).json({ success: true });
            } catch (dbError) {
                console.error("[API/projects] DB POST Error:", dbError);
                return res.status(500).json({ error: "Database save failed", details: dbError.message });
            }
        }

        // 4. DELETE: Remove only own project
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: "Missing ID" });

            try {
                await sql`
                    DELETE FROM projects 
                    WHERE id = ${id} AND user_id = ${userId}
                `;
                return res.status(200).json({ success: true });
            } catch (dbError) {
                console.error("[API/projects] DB DELETE Error:", dbError);
                return res.status(500).json({ error: "Database delete failed", details: dbError.message });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error("[API/projects] Global Handler Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
}
