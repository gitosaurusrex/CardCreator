import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/clerk-sdk-node';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4.5mb', // Vercel limit is 4.5MB total for serverless functions
        },
    },
};

export default async function handler(req, res) {
    try {
        // 1. Verify Authentication
        let userId;
        try {
            const auth = getAuth(req);
            userId = auth.userId;
        } catch (authError) {
            console.error("Upload Auth Error:", authError);
            return res.status(401).json({ error: "Authentication failed" });
        }

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { data, contentType, fileName } = req.body;
        if (!data || !contentType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 2. Ensure table exists
        try {
            await sql`
                CREATE TABLE IF NOT EXISTS images (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    file_name TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `;
        } catch (dbInitError) {
            console.error("Image Table Init Error:", dbInitError);
            // We continue as it might already exist and it's just a permission issue on CREATE TABLE
        }

        // 3. Generate a simple unique ID
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // 4. Store in DB
        try {
            await sql`
                INSERT INTO images (id, user_id, data, content_type, file_name)
                VALUES (${id}, ${userId}, ${data}, ${contentType}, ${fileName || 'unnamed'})
            `;
        } catch (insertError) {
            console.error("Image Insert Error:", insertError);
            return res.status(500).json({ error: "Database save failed", message: insertError.message });
        }

        // 5. Return the URL
        return res.status(200).json({
            id,
            url: `/api/image?id=${id}`,
            success: true
        });

    } catch (error) {
        console.error("Upload Handler Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
}
