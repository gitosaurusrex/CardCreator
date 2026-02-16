import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    try {
        console.log("Starting DB Init...");

        // Projects Table
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
        console.log("Projects table check done");

        // Images Table
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
        console.log("Images table check done");

        return res.status(200).send(JSON.stringify({
            status: "success",
            message: "All tables verified/created"
        }));
    } catch (error) {
        console.error("Init-DB Error:", error);
        return res.status(500).send(JSON.stringify({
            status: "error",
            message: error.message,
            stack: error.stack
        }));
    }
}
