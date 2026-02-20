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

    // Configuración robusta del cliente
    // Usamos la base de Nextcloud y el path completo para evitar confusiones
    const client = createClient(baseUrl, {
      username: user,
      password: appPassword,
    });

    // Construir la ruta completa combinando la base de webdav y la ruta solicitada
    // Eliminamos duplicados de '/' si existieran
    const fullPath = `${webdavPath}/${decodedPath}`.replace(/\/+/g, '/');

    console.log('[API DEBUG] Base URL:', baseUrl);
    console.log('[API DEBUG] WebDAV Path Config:', webdavPath);
    console.log('[API DEBUG] Full Target Path:', fullPath);

    const result: any = await client.getDirectoryContents(fullPath);
    console.log('[API DEBUG] WebDAV Raw Result Count:', result.length);

    // Adaptar el formato de la librería webdav al formato esperado por el frontend
    const items = result.map((item: any) => {
      // Intentar limpiar el path de forma robusta
      let itemPath = item.filename;
      if (itemPath.startsWith(webdavPath)) {
        itemPath = itemPath.substring(webdavPath.length);
      }
      if (!itemPath.startsWith('/')) itemPath = '/' + itemPath;

      return {
        name: item.basename,
        path: itemPath,
        isFolder: item.type === 'directory',
        size: item.size || 0,
        mime: item.mime || ''
      };
    })
      .filter((item: any) => item.path !== '' && item.path !== '/')
      .sort((a: any, b: any) => {
        // Carpetas primero
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

    console.log('✓ Successfully retrieved', items.length, 'items');

    return new Response(JSON.stringify({ success: true, items }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
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
