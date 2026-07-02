import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;
const DIST_DIR = path.join(__dirname, 'dist');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROJECT_CATEGORIES = ['ue', 'ai', 'research'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let subDir = '';
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      subDir = 'images';
    } else if (['.mp4', '.webm'].includes(ext)) {
      subDir = 'videos';
    } else {
      return cb(new Error('不支持的文件类型'));
    }
    
    const targetDir = path.join(UPLOADS_DIR, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueName = `${Date.now()}_${baseName}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...getCorsHeaders(),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function sendSuccess(res, statusCode, data, message = 'ok') {
  sendJson(res, statusCode, {
    success: true,
    message,
    data
  });
}

function sendError(res, statusCode, message, errorCode) {
  sendJson(res, statusCode, {
    success: false,
    message,
    errorCode
  });
}

function sendText(res, statusCode, content) {
  res.writeHead(statusCode, {
    ...getCorsHeaders(),
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end(content);
}

function parseJson(str) {
  try {
    return JSON.parse(str || '{}');
  } catch {
    return {};
  }
}

function readRequestBody(req, callback) {
  let body = Buffer.alloc(0);
  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk]);
  });
  req.on('end', () => {
    callback(body.toString('utf8'));
  });
}

function validateApplicationPayload(payload) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const message = String(payload.message || '').trim();

  if (!name) {
    return { isValid: false, message: 'name 为必填字段。', errorCode: 'INVALID_PARAMS' };
  }
  if (!email) {
    return { isValid: false, message: 'email 为必填字段。', errorCode: 'INVALID_PARAMS' };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { isValid: false, message: 'email 格式不正确。', errorCode: 'INVALID_EMAIL' };
  }
  if (!message) {
    return { isValid: false, message: 'message 为必填字段。', errorCode: 'INVALID_PARAMS' };
  }

  return { isValid: true, data: { name, email, message } };
}

function resolveStaticFile(pathname) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, '');
  const hasDistBuild = fs.existsSync(DIST_DIR);

  if (!hasDistBuild) {
    return null;
  }

  if (!cleanPath) {
    return path.join(DIST_DIR, 'index.html');
  }

  if (cleanPath.startsWith('uploads/')) {
    const uploadFile = path.join(__dirname, cleanPath);
    if (fs.existsSync(uploadFile)) {
      return uploadFile;
    }
    
    const fileName = cleanPath.replace('uploads/', '');
    const rootFile = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(rootFile)) {
      return rootFile;
    }
    
    return null;
  }

  const requestedFile = path.join(DIST_DIR, cleanPath);
  if (path.extname(cleanPath)) {
    return requestedFile;
  }

  return path.join(DIST_DIR, 'index.html');
}

function serveFile(res, filePath, req) {
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    
    const head = {
      ...getCorsHeaders(),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    };
    
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      ...getCorsHeaders(),
      'Content-Length': fileSize,
      'Content-Type': contentType
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

function transformProject(project) {
  if (!project) return null;
  return {
    id: project.id,
    title: project.title,
    category: project.category,
    type: project.type,
    description: project.description,
    introduction: project.introduction,
    coverUrl: project.cover_url,
    videoUrl: project.video_url,
    imageUrls: project.image_urls ? JSON.parse(project.image_urls) : [],
    videoUrls: project.video_urls ? JSON.parse(project.video_urls) : [],
    sortOrder: project.sort_order,
    visible: project.visible === 1,
    showOnHome: project.show_on_home === 1,
    createdAt: project.created_at,
    updatedAt: project.updated_at
  };
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders());
    res.end();
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/login') {
    readRequestBody(req, (body) => {
      const payload = parseJson(body);
      const { username, password } = payload;
      
      if (username === 'admin' && password === 'admin123') {
        sendSuccess(res, 200, { 
          id: 1, 
          username: 'admin', 
          email: 'admin@example.com',
          role: 'admin'
        }, '登录成功');
      } else {
        sendError(res, 401, '用户名或密码错误', 'AUTH_FAILED');
      }
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/applications') {
    try {
      const applications = await query('SELECT * FROM applications ORDER BY created_at DESC');
      sendSuccess(res, 200, applications, '报名列表获取成功。');
    } catch (error) {
      sendError(res, 500, '报名列表读取失败，请稍后重试。', 'APPLICATIONS_READ_FAILED');
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/applications') {
    readRequestBody(req, async (body) => {
      const payload = parseJson(body);
      const validation = validateApplicationPayload(payload);
      if (!validation.isValid) {
        sendError(res, 400, validation.message, validation.errorCode);
        return;
      }

      try {
        const [result] = await query(
          'INSERT INTO applications (name, email, message) VALUES (?, ?, ?)',
          [validation.data.name, validation.data.email, validation.data.message]
        );
        const application = await query(
          'SELECT * FROM applications WHERE id = ?',
          [result.insertId]
        );
        sendSuccess(res, 200, application[0], '报名信息提交成功，我们会尽快联系你。');
      } catch (error) {
        sendError(res, 500, '报名信息保存失败，请稍后重试。', 'APPLICATION_CREATE_FAILED');
      }
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/projects') {
    const category = String(requestUrl.searchParams.get('category') || '').trim();

    if (category && !PROJECT_CATEGORIES.includes(category)) {
      sendError(res, 400, 'category 仅支持 ue、ai、research。', 'INVALID_CATEGORY');
      return;
    }

    try {
      let sql = 'SELECT * FROM projects WHERE visible = 1';
      let params = [];
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      sql += ' ORDER BY sort_order ASC';
      
      const projects = await query(sql, params);
      const transformed = projects.map(transformProject);
      sendSuccess(res, 200, transformed, '作品列表获取成功。');
    } catch (error) {
      sendError(res, 500, '作品列表读取失败，请稍后重试。', 'PROJECTS_READ_FAILED');
    }
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/projects/all') {
    try {
      const projects = await query('SELECT * FROM projects ORDER BY sort_order ASC');
      const transformed = projects.map(transformProject);
      sendSuccess(res, 200, transformed);
    } catch (error) {
      sendError(res, 500, '作品列表读取失败。', 'PROJECTS_READ_FAILED');
    }
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/projects/')) {
    const projectId = decodeURIComponent(requestUrl.pathname.replace('/api/projects/', '')).trim();

    if (!projectId) {
      sendError(res, 400, '项目 id 不能为空。', 'INVALID_PROJECT_ID');
      return;
    }

    try {
      const projects = await query('SELECT * FROM projects WHERE id = ? AND visible = 1', [projectId]);
      if (projects.length === 0) {
        sendError(res, 404, '未找到对应作品。', 'PROJECT_NOT_FOUND');
        return;
      }
      sendSuccess(res, 200, transformProject(projects[0]), '作品详情获取成功。');
    } catch (error) {
      sendError(res, 500, '作品详情读取失败，请稍后重试。', 'PROJECTS_READ_FAILED');
    }
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/users') {
    try {
      const users = await query('SELECT id, username, email, role, created_at FROM users');
      sendSuccess(res, 200, users);
    } catch (error) {
      sendError(res, 500, '用户列表读取失败。', 'USERS_READ_FAILED');
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/users') {
    readRequestBody(req, async (body) => {
      const payload = parseJson(body);

      if (!payload.username || !payload.email || !payload.password) {
        sendError(res, 400, '用户名、邮箱和密码为必填字段。', 'INVALID_PARAMS');
        return;
      }

      try {
        const [result] = await query(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          [payload.username, payload.email, payload.password, payload.role || 'user']
        );
        const users = await query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [result.insertId]);
        sendSuccess(res, 200, users[0]);
      } catch (error) {
        sendError(res, 500, '创建用户失败。', 'USER_CREATE_FAILED');
      }
    });
    return;
  }

  const userUpdateMatch = requestUrl.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userUpdateMatch && req.method === 'PUT') {
    readRequestBody(req, async (body) => {
      const payload = parseJson(body);
      const userId = parseInt(userUpdateMatch[1]);

      try {
        const updates = [];
        const params = [];
        
        if (payload.username) { updates.push('username = ?'); params.push(payload.username); }
        if (payload.email) { updates.push('email = ?'); params.push(payload.email); }
        if (payload.role) { updates.push('role = ?'); params.push(payload.role); }
        if (payload.password) { updates.push('password = ?'); params.push(payload.password); }
        
        if (updates.length === 0) {
          sendError(res, 400, '没有需要更新的字段。', 'INVALID_PARAMS');
          return;
        }
        
        params.push(userId);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        
        const users = await query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [userId]);
        sendSuccess(res, 200, users[0]);
      } catch (error) {
        sendError(res, 500, '更新用户失败。', 'USER_UPDATE_FAILED');
      }
    });
    return;
  }

  const userDeleteMatch = requestUrl.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userDeleteMatch && req.method === 'DELETE') {
    const userId = parseInt(userDeleteMatch[1]);
    try {
      const result = await query('DELETE FROM users WHERE id = ?', [userId]);
      if (result.affectedRows === 0) {
        sendError(res, 404, '用户不存在。', 'USER_NOT_FOUND');
        return;
      }
      sendSuccess(res, 200, {});
    } catch (error) {
      sendError(res, 500, '删除用户失败。', 'USER_DELETE_FAILED');
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/projects') {
    readRequestBody(req, async (body) => {
      const payload = parseJson(body);

      if (!payload.title) {
        sendError(res, 400, '标题为必填字段。', 'INVALID_PARAMS');
        return;
      }

      try {
        const newProject = {
          id: Date.now().toString(),
          title: payload.title,
          category: payload.category || 'ue',
          type: payload.type || '',
          description: payload.description || '',
          introduction: payload.introduction || '',
          cover_url: payload.coverUrl || '',
          video_url: payload.videoUrl || '',
          image_urls: JSON.stringify(Array.isArray(payload.imageUrls) ? payload.imageUrls : []),
          video_urls: JSON.stringify(Array.isArray(payload.videoUrls) ? payload.videoUrls : []),
          sort_order: payload.sortOrder || 0,
          visible: payload.visible !== undefined ? (payload.visible ? 1 : 0) : 1,
          show_on_home: payload.showOnHome !== undefined ? (payload.showOnHome ? 1 : 0) : 0
        };
        
        await query(
          'INSERT INTO projects (id, title, category, type, description, introduction, cover_url, video_url, image_urls, video_urls, sort_order, visible, show_on_home) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newProject.id, newProject.title, newProject.category, newProject.type, newProject.description, newProject.introduction, newProject.cover_url, newProject.video_url, newProject.image_urls, newProject.video_urls, newProject.sort_order, newProject.visible, newProject.show_on_home]
        );
        
        sendSuccess(res, 200, transformProject(newProject));
      } catch (error) {
        sendError(res, 500, '创建作品失败。', 'PROJECT_CREATE_FAILED');
      }
    });
    return;
  }

  const projectUpdateMatch = requestUrl.pathname.match(/^\/api\/projects\/(.+)$/);
  if (projectUpdateMatch && req.method === 'PUT') {
    const projectId = decodeURIComponent(projectUpdateMatch[1]);
    readRequestBody(req, async (body) => {
      const payload = parseJson(body);

      try {
        const updates = [];
        const params = [];
        
        if (payload.title !== undefined) { updates.push('title = ?'); params.push(payload.title); }
        if (payload.category !== undefined) { updates.push('category = ?'); params.push(payload.category); }
        if (payload.type !== undefined) { updates.push('type = ?'); params.push(payload.type); }
        if (payload.description !== undefined) { updates.push('description = ?'); params.push(payload.description); }
        if (payload.introduction !== undefined) { updates.push('introduction = ?'); params.push(payload.introduction); }
        if (payload.coverUrl !== undefined) { updates.push('cover_url = ?'); params.push(payload.coverUrl); }
        if (payload.videoUrl !== undefined) { updates.push('video_url = ?'); params.push(payload.videoUrl); }
        if (payload.imageUrls !== undefined) { updates.push('image_urls = ?'); params.push(JSON.stringify(Array.isArray(payload.imageUrls) ? payload.imageUrls : [])); }
        if (payload.videoUrls !== undefined) { updates.push('video_urls = ?'); params.push(JSON.stringify(Array.isArray(payload.videoUrls) ? payload.videoUrls : [])); }
        if (payload.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(payload.sortOrder); }
        if (payload.visible !== undefined) { updates.push('visible = ?'); params.push(payload.visible ? 1 : 0); }
        if (payload.showOnHome !== undefined) { updates.push('show_on_home = ?'); params.push(payload.showOnHome ? 1 : 0); }
        
        if (updates.length === 0) {
          sendError(res, 400, '没有需要更新的字段。', 'INVALID_PARAMS');
          return;
        }
        
        params.push(projectId);
        const result = await query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
        
        if (result.affectedRows === 0) {
          sendError(res, 404, '作品不存在。', 'PROJECT_NOT_FOUND');
          return;
        }
        
        const projects = await query('SELECT * FROM projects WHERE id = ?', [projectId]);
        sendSuccess(res, 200, transformProject(projects[0]));
      } catch (error) {
        sendError(res, 500, '更新作品失败。', 'PROJECT_UPDATE_FAILED');
      }
    });
    return;
  }

  const projectDeleteMatch = requestUrl.pathname.match(/^\/api\/projects\/(.+)$/);
  if (projectDeleteMatch && req.method === 'DELETE') {
    const projectId = decodeURIComponent(projectDeleteMatch[1]);
    try {
      const result = await query('DELETE FROM projects WHERE id = ?', [projectId]);
      if (result.affectedRows === 0) {
        sendError(res, 404, '作品不存在。', 'PROJECT_NOT_FOUND');
        return;
      }
      sendSuccess(res, 200, {});
    } catch (error) {
      sendError(res, 500, '删除作品失败。', 'PROJECT_DELETE_FAILED');
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/upload') {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            sendError(res, 400, '文件大小超过限制（最大100MB）。', 'FILE_TOO_LARGE');
          } else {
            sendError(res, 400, `文件上传错误: ${err.message}`, 'UPLOAD_ERROR');
          }
        } else {
          sendError(res, 400, err.message || '不支持的文件类型', 'UPLOAD_ERROR');
        }
        return;
      }

      if (!req.file) {
        sendError(res, 400, '未找到文件。', 'NO_FILE');
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      let fileType = '';
      let subDir = '';
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        fileType = 'image';
        subDir = 'images';
      } else if (['.mp4', '.webm'].includes(ext)) {
        fileType = 'video';
        subDir = 'videos';
      } else {
        sendError(res, 400, '不支持的文件类型。', 'INVALID_FILE_TYPE');
        return;
      }

      const fileUrl = `/uploads/${subDir}/${req.file.filename}`;
      sendSuccess(res, 200, { url: fileUrl, type: fileType });
    });
    return;
  }

  const filePath = resolveStaticFile(requestUrl.pathname);
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        serveFile(res, filePath, req);
      } else {
        sendText(res, 404, 'Not Found');
      }
    } catch (error) {
      sendText(res, 500, 'Internal Server Error');
    }
    return;
  }

  sendText(res, 404, 'Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
