import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
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

        res.status(200).json({ status: "success", message: "Tables initialized" });
    } catch (error) {
        console.error("Init Error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
}
