import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    console.log(`[API/upload] Request: ${req.method}`);

    try {
        // 1. Verify Authentication
        let authState;
        try {
            authState = getAuth(req);
            if (!authState || !authState.userId) {
                console.error("[API/upload] No userId found in auth state");
                return res.status(401).json({ error: "Unauthorized" });
            }
        } catch (authError) {
            console.error("[API/upload] Clerk Auth Error:", authError);
            return res.status(401).json({ error: "Authentication failed" });
        }

        const userId = authState.userId;

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { data, contentType, fileName } = req.body;
        if (!data || !contentType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 2. Store in DB
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        try {
            await sql`
                INSERT INTO images (id, user_id, data, content_type, file_name)
                VALUES (${id}, ${userId}, ${data}, ${contentType}, ${fileName || 'unnamed'})
            `;

            return res.status(200).json({
                id,
                url: `/api/image?id=${id}`,
                success: true
            });
        } catch (dbError) {
            console.error("[API/upload] DB Insert Error:", dbError);
            return res.status(500).json({ error: "Database save failed", message: dbError.message });
        }

    } catch (error) {
        console.error("[API/upload] Global Handler Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
}
