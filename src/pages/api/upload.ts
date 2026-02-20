import type { APIRoute } from 'astro';
import { createClient } from 'webdav';
import { Buffer } from 'node:buffer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folderPath') as string || '';

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = import.meta.env.NEXTCLOUD_BASE_URL;
    const user = import.meta.env.NEXTCLOUD_USER;
    const appPassword = import.meta.env.NEXTCLOUD_APP_PASSWORD;
    const webdavBase = import.meta.env.NEXTCLOUD_WEBDAV_PATH;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const client = createClient(baseUrl, {
      username: user,
      password: appPassword,
    });

    // Ruta completa de destino
    const destPath = `${webdavBase}/${folderPath}/${safeName}`.replace(/\/+/g, '/');

    console.log('→ Upload PUT (Client):', destPath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.putFileContents(destPath, buffer, {
      contentLength: buffer.length,
      overwrite: true // Opcional, pero suele ser lo deseado en este flujo
    });

    console.log('← Upload Success');

    return new Response(JSON.stringify({ success: true, filename: safeName }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Upload Error:', error);
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
