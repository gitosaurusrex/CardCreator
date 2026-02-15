import { put } from '@vercel/blob';

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return new Response('Missing filename', { status: 400 });
    }

    try {
        // Prepend a folder to keep the 'cardblob' organized
        const blobPath = `tile-maker/${Date.now()}-${filename}`;

        const blob = await put(blobPath, request.body, {
            access: 'public',
        });

        return new Response(JSON.stringify(blob), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Blob upload error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
        });
    }
}
