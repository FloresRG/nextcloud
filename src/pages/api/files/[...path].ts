import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  try {
    const baseUrl = import.meta.env.NEXTCLOUD_BASE_URL;
    const user = import.meta.env.NEXTCLOUD_USER;
    const appPassword = import.meta.env.NEXTCLOUD_APP_PASSWORD;
    const webdavBase = import.meta.env.NEXTCLOUD_WEBDAV_PATH; // /remote.php/dav/files/admus
    
    const requestPath = params.path || '';
    const decodedPath = decodeURIComponent(requestPath).replace(/^\/+/, '').replace(/\/+$/, '');
    
    // Construir URL: baseUrl + webdavBase + optional subpath
    // Ej: http://192.168.1.50/remote.php/dav/files/admus + /Documents
    const davUrl = decodedPath 
      ? `${baseUrl}${webdavBase}/${decodedPath}` 
      : `${baseUrl}${webdavBase}/`;
    
    console.log('→ WebDAV PROPFIND:', davUrl);
    
    const authHeader = 'Basic ' + Buffer.from(`${user}:${appPassword}`).toString('base64');
    
    const ncResponse = await fetch(davUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Depth': '1',
        'Content-Type': 'application/xml',
      },
      body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:resourcetype/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`
    });
    
    console.log('← Nextcloud Status:', ncResponse.status);
    
    if(!ncResponse.ok) {
      const errorText = await ncResponse.text();
      console.error('Nextcloud error:', ncResponse.status, errorText.substring(0, 200));
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Nextcloud ${ncResponse.status}` 
      }), { 
        status: ncResponse.status,
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const xmlText = await ncResponse.text();
    const items = parseWebDAVResponse(xmlText, webdavBase);
    
    console.log('✓ Parsed', items.length, 'items');
    return new Response(JSON.stringify({ success: true,  items }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch(error: any) {
    console.error('💥 API Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function parseWebDAVResponse(xmlText: string, basePath: string) {
  const items: any[] = [];
  // Extraer cada bloque <d:response>
  const responses = xmlText.match(/<d:response>[\s\S]*?<\/d:response>/g) || [];
  
  for(const response of responses) {
    // Extraer href
    const hrefMatch = response.match(/<d:href>([^<]+)<\/d:href>/);
    if(!hrefMatch) continue;
    const href = hrefMatch[1];
    
    // Extraer displayname
    const nameMatch = response.match(/<d:displayname>([^<]*)<\/d:displayname>/);
    const displayName = nameMatch ? nameMatch[1] : href.split('/').filter(Boolean).pop() || '';
    
    // Extraer tamaño
    const sizeMatch = response.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
    
    // Extraer tipo MIME
    const mimeMatch = response.match(/<d:getcontenttype>([^<]*)<\/d:getcontenttype>/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    
    // Detectar si es carpeta (tiene <d:collection/> en resourcetype)
    const isFolder = response.includes('<d:collection/>');
    
    // Calcular path relativo para navegación
    let relativePath = href.replace(basePath, '');
    if(relativePath.startsWith('/')) relativePath = relativePath.slice(1);
    if(relativePath.endsWith('/')) relativePath = relativePath.slice(0, -1);
    
    // Saltar el elemento raíz (la carpeta actual)
    if(href === basePath + '/' || href === basePath || relativePath === '') {
      continue;
    }
    
    items.push({
      name: decodeURIComponent(displayName),
      path: relativePath,
      isFolder,
      size,
      mime,
    });
  }
  
  // Ordenar: carpetas primero, luego por nombre
  items.sort((a, b) => {
    if(a.isFolder && !b.isFolder) return -1;
    if(!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });
  
  return items;
}