import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).end();
        }

        const { rows } = await sql`
            SELECT data, content_type FROM images WHERE id = ${id}
        `;

        if (rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }

        const { data, content_type } = rows[0];

        // Format: data:image/png;base64,iVBOR...
        // We need to extract the base64 part
        const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', content_type);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(buffer);

    } catch (error) {
        console.error("Image Fetch Error:", error);
        return res.status(500).end();
    }
}
