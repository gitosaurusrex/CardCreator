import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    // 0. Robust Logging for Vercel
    console.log(`[API/projects] Request: ${req.method} Path: ${req.url}`);

    try {
        // 1. Sanity Check for Env Vars
        const clerkKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
        const dbUrl = process.env.POSTGRES_URL;

        if (!clerkKey) {
            console.error("[API/projects] CRITICAL: Clerk keys (CLERK_SECRET_KEY/API_KEY) missing");
            return res.status(500).json({ error: "Auth Configuration Error", details: "Key missing" });
        }
        if (!dbUrl) {
            console.error("[API/projects] CRITICAL: POSTGRES_URL missing");
            return res.status(500).json({ error: "DB Configuration Error", details: "Url missing" });
        }

        // 2. Verify Authentication
        let userId;
        try {
            const authState = getAuth(req);
            userId = authState?.userId;

            if (!userId) {
                console.warn("[API/projects] Unauthorized: No userId found in Clerk auth state");
                return res.status(401).json({ error: "Unauthorized. Please sign in." });
            }
        } catch (authError) {
            console.error("[API/projects] Clerk SDK Authentication failure:", authError);
            return res.status(401).json({
                error: "Authentication process failed",
                details: authError.message
            });
        }

        // 3. GET: List only current user's projects
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
                console.error("[API/projects] DB Query Error (GET):", dbError);
                return res.status(500).json({ error: "Database query failed", details: dbError.message });
            }
        }

        // 4. POST: Save/Update
        if (req.method === 'POST') {
            const { id, name, cards } = req.body;
            if (!id || !name || !cards) {
                return res.status(400).json({ error: "Missing required fields (id, name, cards)" });
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
                console.error("[API/projects] DB Save Error (POST):", dbError);
                return res.status(500).json({ error: "Database save failed", details: dbError.message });
            }
        }

        // 5. DELETE: Remove project
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: "Missing project ID" });

            try {
                await sql`
                    DELETE FROM projects 
                    WHERE id = ${id} AND user_id = ${userId}
                `;
                return res.status(200).json({ success: true });
            } catch (dbError) {
                console.error("[API/projects] DB Delete Error (DELETE):", dbError);
                return res.status(500).json({ error: "Database delete failed", details: dbError.message });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalError) {
        console.error("[API/projects] Unhandled Global Exception:", globalError);
        return res.status(500).json({
            error: "Unexpected Runtime Exception",
            message: globalError instanceof Error ? globalError.message : String(globalError)
        });
    }
}
