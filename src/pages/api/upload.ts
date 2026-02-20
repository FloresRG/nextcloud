import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folderPath') as string || '';
    
    if(!file) {
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
    
    // Construir URL de subida: baseUrl + webdavBase + folder + filename
    const uploadUrl = folderPath
      ? `${baseUrl}${webdavBase}/${folderPath}/${safeName}`
      : `${baseUrl}${webdavBase}/${safeName}`;
    
    console.log('→ Upload PUT:', uploadUrl);
    
    const authHeader = 'Basic ' + Buffer.from(`${user}:${appPassword}`).toString('base64');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });
    
    console.log('← Upload Status:', response.status);
    
    if(response.ok || response.status === 201 || response.status === 204) {
      return new Response(JSON.stringify({ success: true, filename: safeName }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status}`);
    }
    
  } catch (error: any) {
    console.error('💥 Upload Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};