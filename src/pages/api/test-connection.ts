import type { APIRoute } from 'astro';
import { createClient } from 'webdav';

export const GET: APIRoute = async () => {
  try {
    const client = createClient(`${import.meta.env.NEXTCLOUD_BASE_URL}/remote.php/dav`, {
      username: import.meta.env.NEXTCLOUD_USER,
      password: import.meta.env.NEXTCLOUD_APP_PASSWORD,
    });
    const result = await client.getDirectoryContents(import.meta.env.NEXTCLOUD_WEBDAV_PATH);
    return new Response(JSON.stringify({ success: true, message: 'Conexión exitosa', filesCount: result.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: 'Error de conexión', error: error.message, code: error.response?.status }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};