import type { APIRoute } from 'astro';
import { createClient } from 'webdav';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { folderName, parentPath } = await request.json();

    const baseUrl = import.meta.env.NEXTCLOUD_BASE_URL;
    const user = import.meta.env.NEXTCLOUD_USER;
    const appPassword = import.meta.env.NEXTCLOUD_APP_PASSWORD;
    const webdavBase = import.meta.env.NEXTCLOUD_WEBDAV_PATH;

    const safeName = folderName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const client = createClient(baseUrl, {
      username: user,
      password: appPassword,
    });

    // Construir la ruta completa
    const destPath = `${webdavBase}/${parentPath}/${safeName}`.replace(/\/+/g, '/');

    console.log('→ Create Directory (Client):', destPath);

    await client.createDirectory(destPath);

    console.log('← Create Directory Success');

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Si ya existe (405 o similar), podemos considerarlo un éxito o avisar
    if (error.response?.status === 405) {
      return new Response(JSON.stringify({ success: true, message: 'Already exists' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('💥 Folder Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.response?.statusText || ''
    }), {
      status: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
