import type { APIRoute } from 'astro';
import { createClient } from 'webdav';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { path } = await request.json();

        if (!path) {
            return new Response(JSON.stringify({ success: false, error: "Path es requerido" }), { status: 400 });
        }

        const client = createClient(import.meta.env.NEXTCLOUD_BASE_URL, {
            username: import.meta.env.NEXTCLOUD_USER,
            password: import.meta.env.NEXTCLOUD_APP_PASSWORD,
        });

        const webdavPath = import.meta.env.NEXTCLOUD_WEBDAV_PATH; // e.g. /remote.php/dav/files/admus
        const fullPath = `${webdavPath}${path}`.replace(/\/+/g, '/').replace(':/', '://');

        console.log("[API DELETE] Deleting:", fullPath);

        await client.deleteFile(fullPath);

        return new Response(JSON.stringify({ success: true }));
    } catch (err: any) {
        console.error("[API DELETE] Error:", err);
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
};
