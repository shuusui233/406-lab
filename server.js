import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;
const APPLICATIONS_FILE = path.join(__dirname, 'applications.json');
const LEGACY_APPLICATIONS_FILE = path.join(__dirname, 'registrations.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const CONTENTS_FILE = path.join(__dirname, 'contents.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const DIST_DIR = path.join(__dirname, 'dist');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROJECT_CATEGORIES = ['ue', 'ai', 'research'];

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
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

function ensureApplicationsFile() {
  if (fs.existsSync(APPLICATIONS_FILE)) {
    return;
  }

  if (fs.existsSync(LEGACY_APPLICATIONS_FILE)) {
    fs.copyFileSync(LEGACY_APPLICATIONS_FILE, APPLICATIONS_FILE);
    return;
  }

  fs.writeFileSync(APPLICATIONS_FILE, '[]', 'utf8');
}

function ensureProjectsFile() {
  if (fs.existsSync(PROJECTS_FILE)) {
    return;
  }

  fs.writeFileSync(PROJECTS_FILE, '[]', 'utf8');
}

// 用户管理
function ensureUsersFile() {
  if (fs.existsSync(USERS_FILE)) {
    return;
  }
  // 创建默认管理员用户
  fs.writeFileSync(USERS_FILE, JSON.stringify([{
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString()
  }]), 'utf8');
}

function readUsers(callback) {
  ensureUsersFile();
  fs.readFile(USERS_FILE, 'utf8', (readError, fileContent) => {
    if (readError) {
      callback(readError);
      return;
    }
    try {
      const users = JSON.parse(fileContent || '[]');
      callback(null, users);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

function saveUsers(users, callback) {
  fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8', callback);
}

// 内容管理
function ensureContentsFile() {
  if (fs.existsSync(CONTENTS_FILE)) {
    return;
  }
  fs.writeFileSync(CONTENTS_FILE, '[]', 'utf8');
}

function readContents(callback) {
  ensureContentsFile();
  fs.readFile(CONTENTS_FILE, 'utf8', (readError, fileContent) => {
    if (readError) {
      callback(readError);
      return;
    }
    try {
      const contents = JSON.parse(fileContent || '[]');
      callback(null, contents);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

function saveContents(contents, callback) {
  fs.writeFile(CONTENTS_FILE, JSON.stringify(contents, null, 2), 'utf8', callback);
}

// 设置管理
function ensureSettingsFile() {
  if (fs.existsSync(SETTINGS_FILE)) {
    return;
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    siteName: '406实训室',
    siteDescription: '创新与实践',
    contactEmail: 'contact@example.com',
    maintenanceMode: false
  }), 'utf8');
}

function readSettings(callback) {
  ensureSettingsFile();
  fs.readFile(SETTINGS_FILE, 'utf8', (readError, fileContent) => {
    if (readError) {
      callback(readError);
      return;
    }
    try {
      const settings = JSON.parse(fileContent || '{}');
      callback(null, settings);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

function saveSettings(settings, callback) {
  fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8', callback);
}

function readApplications(callback) {
  ensureApplicationsFile();

  fs.readFile(APPLICATIONS_FILE, 'utf8', (readError, fileContent) => {
    if (readError) {
      callback(readError);
      return;
    }

    try {
      const applications = JSON.parse(fileContent || '[]');
      callback(null, applications);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

function readProjects(callback) {
  ensureProjectsFile();

  fs.readFile(PROJECTS_FILE, 'utf8', (readError, fileContent) => {
    if (readError) {
      callback(readError);
      return;
    }

    try {
      const projects = JSON.parse(fileContent || '[]');
      callback(null, projects);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

function saveProjects(projects, callback) {
  fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf8', (writeError) => {
    if (writeError) {
      callback(writeError);
      return;
    }
    callback(null);
  });
}

function saveApplications(applications, callback) {
  fs.writeFile(
    APPLICATIONS_FILE,
    JSON.stringify(applications, null, 2),
    'utf8',
    callback
  );
}

function createApplication(data, callback) {
  readApplications((readError, applications) => {
    if (readError) {
      callback(readError);
      return;
    }

    const application = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      message: data.message,
      createdAt: new Date().toISOString()
    };

    applications.push(application);

    saveApplications(applications, (writeError) => {
      if (writeError) {
        callback(writeError);
        return;
      }

      callback(null, application);
    });
  });
}

function readRequestBody(req, callback) {
  let body = Buffer.alloc(0);

  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk]);
  });

  req.on('end', () => {
    // 使用 UTF-8 编码转换为字符串
    callback(body.toString('utf8'));
  });
}

// 文件上传处理
function handleFileUpload(req, res) {
  const contentType = req.headers['content-type'];
  const boundary = contentType?.split('boundary=')[1];
  
  if (!boundary) {
    sendError(res, 400, '缺少请求边界。', 'INVALID_REQUEST');
    return;
  }

  let body = Buffer.alloc(0);
  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk]);
  });

  req.on('end', () => {
    try {
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = [];
      let start = 0;
      
      while (start < body.length) {
        const boundaryIndex = body.indexOf(boundaryBuffer, start);
        if (boundaryIndex === -1) break;
        
        if (boundaryIndex > start) {
          parts.push(body.slice(start, boundaryIndex));
        }
        start = boundaryIndex + boundaryBuffer.length;
      }

      let fileName = '';
      let fileData = Buffer.alloc(0);

      for (const part of parts) {
        const partStr = part.toString('utf8');
        if (partStr.includes('Content-Disposition')) {
          const filenameMatch = partStr.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            fileName = filenameMatch[1];
          }

          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            fileData = part.slice(headerEnd + 4);
            
            // 移除末尾的 \r\n--\r\n
            const endMarker = fileData.indexOf('\r\n--');
            if (endMarker !== -1) {
              fileData = fileData.slice(0, endMarker);
            }
          }
        }
      }

      if (!fileName) {
        sendError(res, 400, '未找到文件名。', 'INVALID_FILE');
        return;
      }

      // 确保上传目录存在
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }

      // 生成唯一文件名
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const uniqueName = `${Date.now()}_${baseName.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      // 检查文件类型
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];
      const fileExt = ext.toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        sendError(res, 400, '不支持的文件类型。', 'INVALID_FILE_TYPE');
        return;
      }

      // 写入文件（使用Buffer）
      fs.writeFile(filePath, fileData, (err) => {
        if (err) {
          console.error('文件写入失败:', err);
          sendError(res, 500, '文件保存失败。', 'FILE_SAVE_FAILED');
          return;
        }

        const fileUrl = `/uploads/${uniqueName}`;
        sendSuccess(res, 200, { url: fileUrl });
      });
    } catch (error) {
      console.error('文件上传处理失败:', error);
      sendError(res, 500, '文件上传处理失败。', 'UPLOAD_ERROR');
    }
  });
}

function validateApplicationPayload(payload) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const message = String(payload.message || '').trim();

  if (!name) {
    return {
      isValid: false,
      message: 'name 为必填字段。',
      errorCode: 'INVALID_PARAMS'
    };
  }

  if (!email) {
    return {
      isValid: false,
      message: 'email 为必填字段。',
      errorCode: 'INVALID_PARAMS'
    };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return {
      isValid: false,
      message: 'email 格式不正确。',
      errorCode: 'INVALID_EMAIL'
    };
  }

  if (!message) {
    return {
      isValid: false,
      message: 'message 为必填字段。',
      errorCode: 'INVALID_PARAMS'
    };
  }

  return {
    isValid: true,
    data: { name, email, message }
  };
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

  // 检查是否是uploads目录的请求
  if (cleanPath.startsWith('uploads/')) {
    const uploadFile = path.join(__dirname, cleanPath);
    if (fs.existsSync(uploadFile)) {
      return uploadFile;
    }
    return null;
  }

  const requestedFile = path.join(DIST_DIR, cleanPath);
  if (path.extname(cleanPath)) {
    return requestedFile;
  }

  return path.join(DIST_DIR, 'index.html');
}

function serveFile(res, filePath) {
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendText(res, 404, '404 Not Found');
      } else {
        sendText(res, 500, `Server Error: ${error.code}`);
      }
      return;
    }

    res.writeHead(200, {
      ...getCorsHeaders(),
      'Content-Type': contentType
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders());
    res.end();
    return;
  }

  // 登录接口
  if (req.method === 'POST' && requestUrl.pathname === '/api/login') {
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const { username, password } = payload;
      
      // 验证登录（硬编码的管理员账户）
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
    readApplications((error, applications) => {
      if (error) {
        sendError(res, 500, '报名列表读取失败，请稍后重试。', 'APPLICATIONS_READ_FAILED');
        return;
      }

      const sortedApplications = [...applications].sort((left, right) =>
        String(right.createdAt).localeCompare(String(left.createdAt))
      );

      sendSuccess(res, 200, sortedApplications, '报名列表获取成功。');
    });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/applications') {
    readRequestBody(req, (body) => {
      let payload = {};

      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const validation = validateApplicationPayload(payload);
      if (!validation.isValid) {
        sendError(res, 400, validation.message, validation.errorCode);
        return;
      }

      createApplication(validation.data, (error, application) => {
        if (error) {
          sendError(res, 500, '报名信息保存失败，请稍后重试。', 'APPLICATION_CREATE_FAILED');
          return;
        }

        sendSuccess(res, 200, application, '报名信息提交成功，我们会尽快联系你。');
      });
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/projects') {
    const category = String(requestUrl.searchParams.get('category') || '').trim();

    if (category && !PROJECT_CATEGORIES.includes(category)) {
      sendError(
        res,
        400,
        'category 仅支持 ue、ai、research。',
        'INVALID_CATEGORY'
      );
      return;
    }

    readProjects((error, projects) => {
      if (error) {
        sendError(res, 500, '作品列表读取失败，请稍后重试。', 'PROJECTS_READ_FAILED');
        return;
      }

      const filteredProjects = projects
        .filter((project) => project.visible)
        .filter((project) => !category || project.category === category)
        .sort((left, right) => left.sortOrder - right.sortOrder);

      sendSuccess(res, 200, filteredProjects, '作品列表获取成功。');
    });
    return;
  }

  // 作品管理接口 - 获取所有作品（管理端）
  if (req.method === 'GET' && requestUrl.pathname === '/api/projects/all') {
    readProjects((error, projects) => {
      if (error) {
        sendError(res, 500, '作品列表读取失败。', 'PROJECTS_READ_FAILED');
        return;
      }
      sendSuccess(res, 200, projects.sort((a, b) => a.sortOrder - b.sortOrder));
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/projects/')) {
    const projectId = decodeURIComponent(requestUrl.pathname.replace('/api/projects/', '')).trim();

    if (!projectId) {
      sendError(res, 400, '项目 id 不能为空。', 'INVALID_PROJECT_ID');
      return;
    }

    readProjects((error, projects) => {
      if (error) {
        sendError(res, 500, '作品详情读取失败，请稍后重试。', 'PROJECTS_READ_FAILED');
        return;
      }

      const project = projects.find(
        (item) => item.id === projectId && item.visible
      );

      if (!project) {
        sendError(res, 404, '未找到对应作品。', 'PROJECT_NOT_FOUND');
        return;
      }

      sendSuccess(res, 200, project, '作品详情获取成功。');
    });
    return;
  }

  // 用户管理接口 - 获取用户列表
  if (req.method === 'GET' && requestUrl.pathname === '/api/users') {
    readUsers((error, users) => {
      if (error) {
        sendError(res, 500, '用户列表读取失败。', 'USERS_READ_FAILED');
        return;
      }
      const usersWithoutPassword = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }));
      sendSuccess(res, 200, usersWithoutPassword);
    });
    return;
  }

  // 用户管理接口 - 创建用户
  if (req.method === 'POST' && requestUrl.pathname === '/api/users') {
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      if (!payload.username || !payload.email || !payload.password) {
        sendError(res, 400, '用户名、邮箱和密码为必填字段。', 'INVALID_PARAMS');
        return;
      }

      readUsers((readError, users) => {
        if (readError) {
          sendError(res, 500, '创建用户失败。', 'USER_CREATE_FAILED');
          return;
        }

        const newUser = {
          id: Date.now(),
          username: payload.username,
          email: payload.email,
          password: payload.password,
          role: payload.role || 'user',
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users, (writeError) => {
          if (writeError) {
            sendError(res, 500, '保存用户失败。', 'USER_SAVE_FAILED');
            return;
          }
          sendSuccess(res, 200, {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.createdAt
          });
        });
      });
    });
    return;
  }

  // 用户管理接口 - 更新用户
  const userUpdateMatch = requestUrl.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userUpdateMatch && req.method === 'PUT') {
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      readUsers((readError, users) => {
        if (readError) {
          sendError(res, 500, '更新用户失败。', 'USER_UPDATE_FAILED');
          return;
        }

        const userIndex = users.findIndex(u => u.id === parseInt(userUpdateMatch[1]));
        if (userIndex === -1) {
          sendError(res, 404, '用户不存在。', 'USER_NOT_FOUND');
          return;
        }

        if (payload.username) users[userIndex].username = payload.username;
        if (payload.email) users[userIndex].email = payload.email;
        if (payload.role) users[userIndex].role = payload.role;
        if (payload.password) users[userIndex].password = payload.password;

        saveUsers(users, (writeError) => {
          if (writeError) {
            sendError(res, 500, '保存用户失败。', 'USER_SAVE_FAILED');
            return;
          }
          sendSuccess(res, 200, {
            id: users[userIndex].id,
            username: users[userIndex].username,
            email: users[userIndex].email,
            role: users[userIndex].role,
            createdAt: users[userIndex].createdAt
          });
        });
      });
    });
    return;
  }

  // 用户管理接口 - 删除用户
  const userDeleteMatch = requestUrl.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userDeleteMatch && req.method === 'DELETE') {
    readUsers((readError, users) => {
      if (readError) {
        sendError(res, 500, '删除用户失败。', 'USER_DELETE_FAILED');
        return;
      }

      const userIndex = users.findIndex(u => u.id === parseInt(userDeleteMatch[1]));
      if (userIndex === -1) {
        sendError(res, 404, '用户不存在。', 'USER_NOT_FOUND');
        return;
      }

      users.splice(userIndex, 1);
      saveUsers(users, (writeError) => {
        if (writeError) {
          sendError(res, 500, '删除用户失败。', 'USER_DELETE_FAILED');
          return;
        }
        sendSuccess(res, 200, {});
      });
    });
    return;
  }

  // 内容管理接口 - 获取内容列表
  if (req.method === 'GET' && requestUrl.pathname === '/api/contents') {
    readContents((error, contents) => {
      if (error) {
        sendError(res, 500, '内容列表读取失败。', 'CONTENTS_READ_FAILED');
        return;
      }
      sendSuccess(res, 200, contents);
    });
    return;
  }

  // 内容管理接口 - 更新内容
  const contentUpdateMatch = requestUrl.pathname.match(/^\/api\/contents\/(.+)$/);
  if (contentUpdateMatch && req.method === 'PUT') {
    const key = decodeURIComponent(contentUpdateMatch[1]);
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      readContents((readError, contents) => {
        if (readError) {
          sendError(res, 500, '更新内容失败。', 'CONTENT_UPDATE_FAILED');
          return;
        }

        const contentIndex = contents.findIndex(c => c.key === key);
        if (contentIndex === -1) {
          contents.push({ key, value: payload.value || '' });
        } else {
          contents[contentIndex].value = payload.value || '';
        }

        saveContents(contents, (writeError) => {
          if (writeError) {
            sendError(res, 500, '保存内容失败。', 'CONTENT_SAVE_FAILED');
            return;
          }
          sendSuccess(res, 200, { key, value: payload.value });
        });
      });
    });
    return;
  }

  // 设置管理接口 - 获取设置
  if (req.method === 'GET' && requestUrl.pathname === '/api/settings') {
    readSettings((error, settings) => {
      if (error) {
        sendError(res, 500, '设置读取失败。', 'SETTINGS_READ_FAILED');
        return;
      }
      sendSuccess(res, 200, settings);
    });
    return;
  }

  // 设置管理接口 - 更新设置
  if (req.method === 'PUT' && requestUrl.pathname === '/api/settings') {
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      readSettings((readError, settings) => {
        if (readError) {
          sendError(res, 500, '更新设置失败。', 'SETTINGS_UPDATE_FAILED');
          return;
        }

        Object.assign(settings, payload);
        saveSettings(settings, (writeError) => {
          if (writeError) {
            sendError(res, 500, '保存设置失败。', 'SETTINGS_SAVE_FAILED');
            return;
          }
          sendSuccess(res, 200, settings);
        });
      });
    });
    return;
  }

  // 作品管理接口 - 创建作品
  if (req.method === 'POST' && requestUrl.pathname === '/api/projects') {
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      if (!payload.title) {
        sendError(res, 400, '标题为必填字段。', 'INVALID_PARAMS');
        return;
      }

      readProjects((readError, projects) => {
        if (readError) {
          sendError(res, 500, '创建作品失败。', 'PROJECT_CREATE_FAILED');
          return;
        }

        const newProject = {
          id: Date.now().toString(),
          title: payload.title,
          category: payload.category || 'ue',
          type: payload.type || '',
          description: payload.description || '',
          coverUrl: payload.coverUrl || '',
          videoUrl: payload.videoUrl || '',
          sortOrder: payload.sortOrder || 0,
          visible: payload.visible !== undefined ? payload.visible : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        projects.push(newProject);
        saveProjects(projects, (writeError) => {
          if (writeError) {
            sendError(res, 500, '保存作品失败。', 'PROJECT_SAVE_FAILED');
            return;
          }
          sendSuccess(res, 200, newProject);
        });
      });
    });
    return;
  }

  // 作品管理接口 - 更新作品
  const projectUpdateMatch = requestUrl.pathname.match(/^\/api\/projects\/(.+)$/);
  if (projectUpdateMatch && req.method === 'PUT') {
    const projectId = decodeURIComponent(projectUpdateMatch[1]);
    readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      readProjects((readError, projects) => {
        if (readError) {
          sendError(res, 500, '更新作品失败。', 'PROJECT_UPDATE_FAILED');
          return;
        }

        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
          sendError(res, 404, '作品不存在。', 'PROJECT_NOT_FOUND');
          return;
        }

        Object.assign(projects[projectIndex], payload, { updatedAt: new Date().toISOString() });

        saveProjects(projects, (writeError) => {
          if (writeError) {
            sendError(res, 500, '保存作品失败。', 'PROJECT_SAVE_FAILED');
            return;
          }
          sendSuccess(res, 200, projects[projectIndex]);
        });
      });
    });
    return;
  }

  // 作品管理接口 - 删除作品
  const projectDeleteMatch = requestUrl.pathname.match(/^\/api\/projects\/(.+)$/);
  if (projectDeleteMatch && req.method === 'DELETE') {
    const projectId = decodeURIComponent(projectDeleteMatch[1]);
    readProjects((readError, projects) => {
      if (readError) {
        sendError(res, 500, '删除作品失败。', 'PROJECT_DELETE_FAILED');
        return;
      }

      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        sendError(res, 404, '作品不存在。', 'PROJECT_NOT_FOUND');
        return;
      }

      projects.splice(projectIndex, 1);
      saveProjects(projects, (writeError) => {
        if (writeError) {
          sendError(res, 500, '删除作品失败。', 'PROJECT_DELETE_FAILED');
          return;
        }
        sendSuccess(res, 200, {});
      });
    });
    return;
  }

  // 文件上传接口
  if (req.method === 'POST' && requestUrl.pathname === '/api/upload') {
    handleFileUpload(req, res);
    return;
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    sendError(res, 404, '接口不存在。', 'API_NOT_FOUND');
    return;
  }

  const staticFile = resolveStaticFile(requestUrl.pathname);
  if (!staticFile) {
    sendText(
      res,
      503,
      '前端尚未构建，请先运行 "npm run dev" 进行开发，或运行 "npm run build" 后再访问此服务。'
    );
    return;
  }

  serveFile(res, staticFile);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
