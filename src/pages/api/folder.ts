import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { folderName, parentPath } = await request.json();
    
    const baseUrl = import.meta.env.NEXTCLOUD_BASE_URL;
    const user = import.meta.env.NEXTCLOUD_USER;
    const appPassword = import.meta.env.NEXTCLOUD_APP_PASSWORD;
    const webdavBase = import.meta.env.NEXTCLOUD_WEBDAV_PATH;
    
    const safeName = folderName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Construir URL para MKCOL
    const folderUrl = parentPath
      ? `${baseUrl}${webdavBase}/${parentPath}/${safeName}/`
      : `${baseUrl}${webdavBase}/${safeName}/`;
    
    console.log('→ MKCOL:', folderUrl);
    
    const authHeader = 'Basic ' + Buffer.from(`${user}:${appPassword}`).toString('base64');
    
    const response = await fetch(folderUrl, {
      method: 'MKCOL',
      headers: {
        'Authorization': authHeader,
      }
    });
    
    console.log('← MKCOL Status:', response.status);
    
    // 201 = creado, 405 = ya existe, 409 = conflicto (también aceptable)
    if(response.ok || response.status === 201 || response.status === 405 || response.status === 409) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const errorText = await response.text();
      throw new Error(`MKCOL failed: ${response.status}`);
    }
    
  } catch (error: any) {
    console.error('💥 Folder Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};