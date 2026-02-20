import type { APIRoute } from 'astro';
import { createClient } from 'webdav';

export const GET: APIRoute = async ({ url }) => {
    try {
        const path = url.searchParams.get('path');
        if (!path) {
            return new Response(JSON.stringify({ success: false, error: 'No path provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const baseUrl = import.meta.env.NEXTCLOUD_BASE_URL;
        const user = import.meta.env.NEXTCLOUD_USER;
        const appPassword = import.meta.env.NEXTCLOUD_APP_PASSWORD;
        const webdavBase = import.meta.env.NEXTCLOUD_WEBDAV_PATH;

        const client = createClient(baseUrl, {
            username: user,
            password: appPassword,
        });

        const fullPath = `${webdavBase}/${path}`.replace(/\/+/g, '/');

        // Obtener los contenidos del archivo como un Buffer/Stream
        const fileBuffer = await client.getFileContents(fullPath) as Buffer;

        // Intentar determinar el tipo de contenido basándose en la extensión si es posible
        // o simplemente pasar una disposición de adjunto
        const fileName = path.split('/').pop() || 'download';

        return new Response(fileBuffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `inline; filename="${fileName}"`,
            }
        });

    } catch (error: any) {
        console.error('💥 Download Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: error.response?.status || 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
