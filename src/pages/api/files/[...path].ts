import type { APIRoute } from 'astro';
import { createClient } from 'webdav';

export const GET: APIRoute = async ({ params }) => {
  try {
    const baseUrl = import.meta.env.NEXTCLOUD_BASE_URL;
    const user = import.meta.env.NEXTCLOUD_USER;
    const appPassword = import.meta.env.NEXTCLOUD_APP_PASSWORD;
    const webdavPath = import.meta.env.NEXTCLOUD_WEBDAV_PATH;
    
    const requestPath = params.path || '';
    const decodedPath = decodeURIComponent(requestPath).replace(/^\/+/, '').replace(/\/+$/, '');
    
    // El cliente de webdav ya maneja la mayoría de las cabeceras y el parsing
    const client = createClient(`${baseUrl}/remote.php/dav`, {
      username: user,
      password: appPassword,
    });

    // Construir la ruta completa dentro del sistema DAV
    // webdavPath suele ser algo como /files/user
    const fullPath = decodedPath 
      ? `${webdavPath}/${decodedPath}` 
      : webdavPath;

    console.log('→ Client Directory Contents:', fullPath);
    
    const result: any = await client.getDirectoryContents(fullPath);
    
    // Adaptar el formato de la librería webdav al formato esperado por el frontend
    const items = result.map((item: any) => ({
      name: item.basename,
      path: item.filename.replace(webdavPath, ''), // Convertir a ruta relativa
      isFolder: item.type === 'directory',
      size: item.size || 0,
      mime: item.mime || ''
    }))
    .filter((item: any) => item.path !== '' && item.path !== '/')
    .sort((a: any, b: any) => {
      // Carpetas primero
      if(a.isFolder && !b.isFolder) return -1;
      if(!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('✓ Successfully retrieved', items.length, 'items');
    
    return new Response(JSON.stringify({ success: true, items }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch(error: any) {
    console.error('💥 API Error:', error);
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
