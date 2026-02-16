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
    res.setHeader('Content-Type', 'application/json');

    try {
        if (!process.env.CLERK_SECRET_KEY && process.env.CLERK_API_KEY) {
            process.env.CLERK_SECRET_KEY = process.env.CLERK_API_KEY;
        } else if (process.env.CLERK_SECRET_KEY && !process.env.CLERK_API_KEY) {
            process.env.CLERK_API_KEY = process.env.CLERK_SECRET_KEY;
        }

        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).send(JSON.stringify({ error: "Unauthorized" }));
        }

        if (req.method !== 'POST') {
            return res.status(405).send(JSON.stringify({ error: "Method not allowed" }));
        }

        const { data, contentType, fileName } = req.body;
        if (!data) {
            return res.status(400).send(JSON.stringify({ error: "No data provided" }));
        }

        const id = Math.random().toString(36).substring(7);
        await sql`
            INSERT INTO images (id, user_id, data, content_type, file_name)
            VALUES (${id}, ${userId}, ${data}, ${contentType || 'image/png'}, ${fileName || 'upload'})
        `;

        return res.status(200).send(JSON.stringify({
            url: `/api/image?id=${id}`,
            success: true
        }));
    } catch (error) {
        console.error("Upload Error:", error);
        return res.status(500).send(JSON.stringify({
            error: "Upload Failed",
            message: error.message
        }));
    }
}
