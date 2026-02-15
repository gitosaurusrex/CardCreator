import { put } from '@vercel/blob';

export default async function handler(req, res) {
    // Standard Node.js handler for Vercel
    const { filename } = req.query;

    if (!filename) {
        return res.status(400).send('Missing filename');
    }

    try {
        // Prepend a folder and timestamp for organization
        const blobPath = `tile-maker/${Date.now()}-${filename}`;

        // Pass the request stream directly to put
        const blob = await put(blobPath, req, {
            access: 'public',
        });

        return res.status(200).json(blob);
    } catch (error) {
        console.error('Blob upload error:', error);
        return res.status(500).json({ error: error.message });
    }
}
