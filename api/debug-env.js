export default function handler(req, res) {
    const envKeys = Object.keys(process.env);
    const hasPostgres = !!process.env.POSTGRES_URL;
    const hasClerk = !!process.env.CLERK_SECRET_KEY || !!process.env.CLERK_API_KEY;

    res.status(200).json({
        status: "debug",
        nodeVersion: process.version,
        envKeys: envKeys.filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD')),
        hasPostgres,
        hasClerk,
        postgresUrlPrefix: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 10) : 'none'
    });
}
