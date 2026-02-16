import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4.5mb',
        },
    },
};

export default async function handler(req, res) {
    console.log(`[API/upload] ${req.method} request received`);

    try {
        // 1. Sanity Check for Env Vars
        const clerkKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
        if (!clerkKey) {
            console.error("[API/upload] Global Clerk Secret Key missing");
            return res.status(500).json({ error: "Configuration Error", details: "Auth key missing" });
        }

        // 2. Verify Authentication
        let userId;
        try {
            const authState = getAuth(req);
            userId = authState?.userId;

            if (!userId) {
                console.error("[API/upload] Unauthorized - No userId in Clerk state");
                return res.status(401).json({ error: "Unauthorized" });
            }
        } catch (authError) {
            console.error("[API/upload] Clerk Auth failure:", authError);
            return res.status(401).json({ error: "Authentication failed", details: authError.message });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { data, contentType, fileName } = req.body;
        if (!data || !contentType) {
            return res.status(400).json({ error: "Missing image data or contentType" });
        }

        // 3. Store in DB
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
            console.error("[API/upload] Database Insert Error:", dbError);
            return res.status(500).json({ error: "Database save failed", message: dbError.message });
        }

    } catch (error) {
        console.error("[API/upload] Unhandled Global Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
