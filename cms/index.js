import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const DATA_DIR = path.join(__dirname, '../');
const DIST_DIR = path.join(__dirname, '../dist');

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

class CMS {
  constructor() {
    this.models = {};
    this.controllers = {};
    this.routes = [];
    this.server = null;
  }

  init() {
    this.registerModels();
    this.registerControllers();
    this.registerRoutes();
    this.ensureDirectories();
  }

  registerModels() {
    this.models.applications = new ApplicationModel();
    this.models.projects = new ProjectModel();
    this.models.users = new UserModel();
    this.models.contents = new ContentModel();
    this.models.settings = new SettingsModel();
  }

  registerControllers() {
    this.controllers.auth = new AuthController(this);
    this.controllers.applications = new ApplicationController(this);
    this.controllers.projects = new ProjectController(this);
    this.controllers.upload = new UploadController(this);
    this.controllers.static = new StaticController(this);
    this.controllers.users = new UsersController(this);
    this.controllers.contents = new ContentsController(this);
    this.controllers.settings = new SettingsController(this);
  }

  registerRoutes() {
    this.routes = [
      { method: 'POST', path: '/api/login', handler: (req, res) => this.controllers.auth.login(req, res) },
      { method: 'GET', path: '/api/applications', handler: (req, res) => this.controllers.applications.list(req, res) },
      { method: 'POST', path: '/api/applications', handler: (req, res) => this.controllers.applications.create(req, res) },
      { method: 'DELETE', path: '/api/applications/:id', handler: (req, res) => this.controllers.applications.delete(req, res) },
      { method: 'GET', path: '/api/projects', handler: (req, res) => this.controllers.projects.list(req, res) },
      { method: 'GET', path: '/api/projects/all', handler: (req, res) => this.controllers.projects.listAll(req, res) },
      { method: 'GET', path: '/api/projects/:id', handler: (req, res) => this.controllers.projects.get(req, res) },
      { method: 'POST', path: '/api/projects', handler: (req, res) => this.controllers.projects.create(req, res) },
      { method: 'PUT', path: '/api/projects/:id', handler: (req, res) => this.controllers.projects.update(req, res) },
      { method: 'DELETE', path: '/api/projects/:id', handler: (req, res) => this.controllers.projects.delete(req, res) },
      { method: 'POST', path: '/api/upload', handler: (req, res) => this.controllers.upload.handle(req, res) },
      { method: 'GET', path: '/api/users', handler: (req, res) => this.controllers.users.list(req, res) },
      { method: 'POST', path: '/api/users', handler: (req, res) => this.controllers.users.create(req, res) },
      { method: 'PUT', path: '/api/users/:id', handler: (req, res) => this.controllers.users.update(req, res) },
      { method: 'DELETE', path: '/api/users/:id', handler: (req, res) => this.controllers.users.delete(req, res) },
      { method: 'GET', path: '/api/contents', handler: (req, res) => this.controllers.contents.list(req, res) },
      { method: 'POST', path: '/api/contents', handler: (req, res) => this.controllers.contents.create(req, res) },
      { method: 'PUT', path: '/api/contents/:id', handler: (req, res) => this.controllers.contents.update(req, res) },
      { method: 'DELETE', path: '/api/contents/:id', handler: (req, res) => this.controllers.contents.delete(req, res) },
      { method: 'GET', path: '/api/settings', handler: (req, res) => this.controllers.settings.get(req, res) },
      { method: 'PUT', path: '/api/settings', handler: (req, res) => this.controllers.settings.update(req, res) },
    ];
  }

  ensureDirectories() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  getCorsHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
  }

  sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
      ...this.getCorsHeaders(),
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(payload));
  }

  sendSuccess(res, statusCode, data, message = 'ok') {
    this.sendJson(res, statusCode, { success: true, message, data });
  }

  sendError(res, statusCode, message, errorCode) {
    this.sendJson(res, statusCode, { success: false, message, errorCode });
  }

  sendText(res, statusCode, content) {
    res.writeHead(statusCode, {
      ...this.getCorsHeaders(),
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end(content);
  }

  serveFile(res, filePath) {
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          this.sendText(res, 404, '404 Not Found');
        } else {
          this.sendText(res, 500, `Server Error: ${error.code}`);
        }
        return;
      }

      res.writeHead(200, {
        ...this.getCorsHeaders(),
        'Content-Type': contentType
      });
      res.end(content);
    });
  }

  readRequestBody(req, callback) {
    let body = Buffer.alloc(0);

    req.on('data', (chunk) => {
      body = Buffer.concat([body, chunk]);
    });

    req.on('end', () => {
      callback(body.toString('utf8'));
    });
  }

  matchRoute(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const routeParts = route.path.split('/');
      const pathParts = pathname.split('/');

      if (routeParts.length !== pathParts.length) continue;

      const params = {};
      let match = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return { route, params };
      }
    }

    return null;
  }

  handleRequest(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = requestUrl;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, this.getCorsHeaders());
      res.end();
      return;
    }

    const matched = this.matchRoute(req.method, pathname);
    if (matched) {
      req.params = matched.params;
      req.query = {};
      requestUrl.searchParams.forEach((value, key) => {
        req.query[key] = value;
      });
      matched.route.handler(req, res);
      return;
    }

    this.controllers.static.serve(req, res);
  }

  start() {
    this.server = http.createServer((req, res) => this.handleRequest(req, res));

    this.server.listen(PORT, () => {
      console.log(`CMS Server running on http://localhost:${PORT}`);
      console.log('Available APIs:');
      console.log('  POST   /api/login');
      console.log('  GET    /api/applications');
      console.log('  POST   /api/applications');
      console.log('  DELETE /api/applications/:id');
      console.log('  GET    /api/projects');
      console.log('  GET    /api/projects/all');
      console.log('  GET    /api/projects/:id');
      console.log('  POST   /api/projects');
      console.log('  PUT    /api/projects/:id');
      console.log('  DELETE /api/projects/:id');
      console.log('  POST   /api/upload');
    });
  }
}

class Model {
  constructor(fileName) {
    this.filePath = path.join(DATA_DIR, fileName);
  }

  read(callback) {
    if (!fs.existsSync(this.filePath)) {
      callback(null, []);
      return;
    }

    fs.readFile(this.filePath, 'utf8', (readError, fileContent) => {
      if (readError) {
        callback(readError);
        return;
      }

      try {
        const data = JSON.parse(fileContent || '[]');
        callback(null, data);
      } catch (parseError) {
        callback(parseError);
      }
    });
  }

  write(data, callback) {
    fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8', callback);
  }
}

class ApplicationModel extends Model {
  constructor() {
    super('applications.json');
  }

  create(data, callback) {
    this.read((readError, items) => {
      if (readError) {
        callback(readError);
        return;
      }

      const item = {
        id: Date.now(),
        name: data.name,
        email: data.email,
        message: data.message,
        createdAt: new Date().toISOString()
      };

      items.push(item);
      this.write(items, (writeError) => {
        if (writeError) {
          callback(writeError);
          return;
        }
        callback(null, item);
      });
    });
  }

  delete(id, callback) {
    this.read((readError, items) => {
      if (readError) {
        callback(readError);
        return;
      }

      const filtered = items.filter(item => item.id !== parseInt(id));
      this.write(filtered, (writeError) => {
        if (writeError) {
          callback(writeError);
          return;
        }
        callback(null);
      });
    });
  }
}

class ProjectModel extends Model {
  constructor() {
    super('projects.json');
  }

  create(data, callback) {
    this.read((readError, items) => {
      if (readError) {
        callback(readError);
        return;
      }

      const now = new Date().toISOString();
      const item = {
        id: Date.now(),
        title: data.title,
        category: data.category || 'ue',
        type: data.type || '',
        description: data.description || '',
        coverUrl: data.coverUrl || '',
        videoUrl: data.videoUrl || '',
        sortOrder: data.sortOrder || 0,
        visible: data.visible !== undefined ? data.visible : true,
        createdAt: now,
        updatedAt: now
      };

      items.push(item);
      this.write(items, (writeError) => {
        if (writeError) {
          callback(writeError);
          return;
        }
        callback(null, item);
      });
    });
  }

  update(id, data, callback) {
    this.read((readError, items) => {
      if (readError) {
        callback(readError);
        return;
      }

      const index = items.findIndex(item => item.id === parseInt(id));
      if (index === -1) {
        callback(new Error('未找到对应作品'));
        return;
      }

      items[index] = {
        ...items[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      this.write(items, (writeError) => {
        if (writeError) {
          callback(writeError);
          return;
        }
        callback(null, items[index]);
      });
    });
  }

  delete(id, callback) {
    this.read((readError, items) => {
      if (readError) {
        callback(readError);
        return;
      }

      const filtered = items.filter(item => item.id !== parseInt(id));
      this.write(filtered, (writeError) => {
        if (writeError) {
          callback(writeError);
          return;
        }
        callback(null);
      });
    });
  }

  getById(id, callback) {
    this.read((readError, items) => {
      if (readError) {
        callback(readError);
        return;
      }

      const item = items.find(item => String(item.id) === String(id));
      callback(null, item || null);
    });
  }
}

class UserModel extends Model {
  constructor() {
    super('users.json');
  }
}

class ContentModel extends Model {
  constructor() {
    super('contents.json');
  }
}

class SettingsModel extends Model {
  constructor() {
    super('settings.json');
  }
}

class AuthController {
  constructor(cms) {
    this.cms = cms;
  }

  login(req, res) {
    this.cms.readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const { username, password } = payload;

      if (username === 'admin' && password === 'admin123') {
        this.cms.sendSuccess(res, 200, {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin'
        }, '登录成功');
      } else {
        this.cms.sendError(res, 401, '用户名或密码错误', 'AUTH_FAILED');
      }
    });
  }
}

class ApplicationController {
  constructor(cms) {
    this.cms = cms;
    this.model = cms.models.applications;
  }

  list(req, res) {
    this.model.read((error, items) => {
      if (error) {
        this.cms.sendError(res, 500, '报名列表读取失败，请稍后重试。', 'APPLICATIONS_READ_FAILED');
        return;
      }

      const sorted = [...items].sort((left, right) =>
        String(right.createdAt).localeCompare(String(left.createdAt))
      );

      this.cms.sendSuccess(res, 200, sorted, '报名列表获取成功。');
    });
  }

  create(req, res) {
    this.cms.readRequestBody(req, (body) => {
      let payload = {};

      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const validation = this.validatePayload(payload);
      if (!validation.isValid) {
        this.cms.sendError(res, 400, validation.message, validation.errorCode);
        return;
      }

      this.model.create(validation.data, (error, item) => {
        if (error) {
          this.cms.sendError(res, 500, '报名信息保存失败，请稍后重试。', 'APPLICATION_CREATE_FAILED');
          return;
        }

        this.cms.sendSuccess(res, 200, item, '报名信息提交成功，我们会尽快联系你。');
      });
    });
  }

  delete(req, res) {
    const { id } = req.params;

    this.model.delete(id, (error) => {
      if (error) {
        this.cms.sendError(res, 500, '删除失败，请稍后重试。', 'APPLICATION_DELETE_FAILED');
        return;
      }

      this.cms.sendSuccess(res, 200, {}, '删除成功。');
    });
  }

  validatePayload(payload) {
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
}

class ProjectController {
  constructor(cms) {
    this.cms = cms;
    this.model = cms.models.projects;
  }

  list(req, res) {
    const { category } = req.query;

    if (category && !PROJECT_CATEGORIES.includes(category)) {
      this.cms.sendError(res, 400, 'category 仅支持 ue、ai、research。', 'INVALID_CATEGORY');
      return;
    }

    this.model.read((error, items) => {
      if (error) {
        this.cms.sendError(res, 500, '作品列表读取失败，请稍后重试。', 'PROJECTS_READ_FAILED');
        return;
      }

      const filtered = items
        .filter(item => item.visible)
        .filter(item => !category || item.category === category)
        .sort((left, right) => left.sortOrder - right.sortOrder);

      this.cms.sendSuccess(res, 200, filtered, '作品列表获取成功。');
    });
  }

  listAll(req, res) {
    this.model.read((error, items) => {
      if (error) {
        this.cms.sendError(res, 500, '作品列表读取失败。', 'PROJECTS_READ_FAILED');
        return;
      }

      const sorted = [...items].sort((left, right) => left.sortOrder - right.sortOrder);
      this.cms.sendSuccess(res, 200, sorted, '作品列表获取成功。');
    });
  }

  get(req, res) {
    const { id } = req.params;

    this.model.getById(id, (error, item) => {
      if (error) {
        this.cms.sendError(res, 500, '作品读取失败。', 'PROJECT_READ_FAILED');
        return;
      }

      if (!item) {
        this.cms.sendError(res, 404, '未找到对应作品。', 'PROJECT_NOT_FOUND');
        return;
      }

      this.cms.sendSuccess(res, 200, item, '作品获取成功。');
    });
  }

  create(req, res) {
    this.cms.readRequestBody(req, (body) => {
      let payload = {};

      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const validation = this.validatePayload(payload);
      if (!validation.isValid) {
        this.cms.sendError(res, 400, validation.message, validation.errorCode);
        return;
      }

      this.model.create(validation.data, (error, item) => {
        if (error) {
          this.cms.sendError(res, 500, '作品创建失败。', 'PROJECT_CREATE_FAILED');
          return;
        }

        this.cms.sendSuccess(res, 200, item, '作品创建成功。');
      });
    });
  }

  update(req, res) {
    const { id } = req.params;

    this.cms.readRequestBody(req, (body) => {
      let payload = {};

      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      this.model.update(id, payload, (error, item) => {
        if (error) {
          this.cms.sendError(res, 404, '未找到对应作品。', 'PROJECT_NOT_FOUND');
          return;
        }

        this.cms.sendSuccess(res, 200, item, '作品更新成功。');
      });
    });
  }

  delete(req, res) {
    const { id } = req.params;

    this.model.delete(id, (error) => {
      if (error) {
        this.cms.sendError(res, 500, '删除失败，请稍后重试。', 'PROJECT_DELETE_FAILED');
        return;
      }

      this.cms.sendSuccess(res, 200, {}, '删除成功。');
    });
  }

  validatePayload(payload) {
    const title = String(payload.title || '').trim();

    if (!title) {
      return { isValid: false, message: 'title 为必填字段。', errorCode: 'INVALID_PARAMS' };
    }

    if (payload.category && !PROJECT_CATEGORIES.includes(payload.category)) {
      return { isValid: false, message: 'category 仅支持 ue、ai、research。', errorCode: 'INVALID_CATEGORY' };
    }

    return { isValid: true, data: payload };
  }
}

class UploadController {
  constructor(cms) {
    this.cms = cms;
  }

  handle(req, res) {
    const contentType = req.headers['content-type'];
    const boundary = contentType?.split('boundary=')[1];

    if (!boundary) {
      this.cms.sendError(res, 400, '缺少请求边界。', 'INVALID_REQUEST');
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
              const endMarker = fileData.indexOf('\r\n--');
              if (endMarker !== -1) {
                fileData = fileData.slice(0, endMarker);
              }
            }
          }
        }

        if (!fileName) {
          this.cms.sendError(res, 400, '未找到文件名。', 'INVALID_FILE');
          return;
        }

        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        const uniqueName = `${Date.now()}_${baseName.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueName);

        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];
        const fileExt = ext.toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
          this.cms.sendError(res, 400, '不支持的文件类型。', 'INVALID_FILE_TYPE');
          return;
        }

        fs.writeFile(filePath, fileData, (err) => {
          if (err) {
            console.error('文件写入失败:', err);
            this.cms.sendError(res, 500, '文件保存失败。', 'FILE_SAVE_FAILED');
            return;
          }

          const fileUrl = `/uploads/${uniqueName}`;
          this.cms.sendSuccess(res, 200, { url: fileUrl }, '文件上传成功。');
        });
      } catch (error) {
        console.error('文件上传处理失败:', error);
        this.cms.sendError(res, 500, '文件上传处理失败。', 'UPLOAD_ERROR');
      }
    });
  }
}

class StaticController {
  constructor(cms) {
    this.cms = cms;
  }

  serve(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = requestUrl;
    const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, '');
    const hasDistBuild = fs.existsSync(DIST_DIR);

    if (!hasDistBuild) {
      this.cms.sendText(res, 404, '404 Not Found');
      return;
    }

    if (!cleanPath) {
      this.cms.serveFile(res, path.join(DIST_DIR, 'index.html'));
      return;
    }

    if (cleanPath.startsWith('uploads/')) {
      const uploadFile = path.join(__dirname, '../', cleanPath);
      if (fs.existsSync(uploadFile)) {
        this.cms.serveFile(res, uploadFile);
        return;
      }
      this.cms.sendText(res, 404, '404 Not Found');
      return;
    }

    const requestedFile = path.join(DIST_DIR, cleanPath);
    if (path.extname(cleanPath)) {
      if (fs.existsSync(requestedFile)) {
        this.cms.serveFile(res, requestedFile);
      } else {
        this.cms.sendText(res, 404, '404 Not Found');
      }
      return;
    }

    this.cms.serveFile(res, path.join(DIST_DIR, 'index.html'));
  }
}

class UsersController {
  constructor(cms) {
    this.cms = cms;
    this.model = cms.models.users;
  }

  list(req, res) {
    this.model.read((error, items) => {
      if (error) {
        this.cms.sendError(res, 500, '用户列表读取失败。', 'USERS_READ_FAILED');
        return;
      }
      this.cms.sendSuccess(res, 200, items, '用户列表获取成功。');
    });
  }

  create(req, res) {
    this.cms.readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const validation = this.validatePayload(payload);
      if (!validation.isValid) {
        this.cms.sendError(res, 400, validation.message, validation.errorCode);
        return;
      }

      this.model.read((readError, items) => {
        if (readError) {
          this.cms.sendError(res, 500, '用户创建失败。', 'USER_CREATE_FAILED');
          return;
        }

        const now = new Date().toISOString();
        const item = {
          id: Date.now(),
          username: payload.username,
          email: payload.email,
          password: payload.password,
          role: payload.role || 'user',
          createdAt: now,
          updatedAt: now
        };

        items.push(item);
        this.model.write(items, (writeError) => {
          if (writeError) {
            this.cms.sendError(res, 500, '用户创建失败。', 'USER_CREATE_FAILED');
            return;
          }
          this.cms.sendSuccess(res, 200, item, '用户创建成功。');
        });
      });
    });
  }

  update(req, res) {
    const { id } = req.params;

    this.cms.readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      this.model.read((readError, items) => {
        if (readError) {
          this.cms.sendError(res, 500, '用户更新失败。', 'USER_UPDATE_FAILED');
          return;
        }

        const index = items.findIndex(item => item.id === parseInt(id));
        if (index === -1) {
          this.cms.sendError(res, 404, '未找到对应用户。', 'USER_NOT_FOUND');
          return;
        }

        items[index] = {
          ...items[index],
          ...payload,
          updatedAt: new Date().toISOString()
        };

        this.model.write(items, (writeError) => {
          if (writeError) {
            this.cms.sendError(res, 500, '用户更新失败。', 'USER_UPDATE_FAILED');
            return;
          }
          this.cms.sendSuccess(res, 200, items[index], '用户更新成功。');
        });
      });
    });
  }

  delete(req, res) {
    const { id } = req.params;

    this.model.read((readError, items) => {
      if (readError) {
        this.cms.sendError(res, 500, '用户删除失败。', 'USER_DELETE_FAILED');
        return;
      }

      const filtered = items.filter(item => item.id !== parseInt(id));
      this.model.write(filtered, (writeError) => {
        if (writeError) {
          this.cms.sendError(res, 500, '用户删除失败。', 'USER_DELETE_FAILED');
          return;
        }
        this.cms.sendSuccess(res, 200, {}, '用户删除成功。');
      });
    });
  }

  validatePayload(payload) {
    const username = String(payload.username || '').trim();
    const email = String(payload.email || '').trim();
    const password = String(payload.password || '').trim();

    if (!username) {
      return { isValid: false, message: 'username 为必填字段。', errorCode: 'INVALID_PARAMS' };
    }

    if (!email) {
      return { isValid: false, message: 'email 为必填字段。', errorCode: 'INVALID_PARAMS' };
    }

    if (!EMAIL_PATTERN.test(email)) {
      return { isValid: false, message: 'email 格式不正确。', errorCode: 'INVALID_EMAIL' };
    }

    if (!password) {
      return { isValid: false, message: 'password 为必填字段。', errorCode: 'INVALID_PARAMS' };
    }

    return { isValid: true, data: payload };
  }
}

class ContentsController {
  constructor(cms) {
    this.cms = cms;
    this.model = cms.models.contents;
  }

  list(req, res) {
    this.model.read((error, items) => {
      if (error) {
        this.cms.sendError(res, 500, '内容列表读取失败。', 'CONTENTS_READ_FAILED');
        return;
      }
      this.cms.sendSuccess(res, 200, items, '内容列表获取成功。');
    });
  }

  create(req, res) {
    this.cms.readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      const validation = this.validatePayload(payload);
      if (!validation.isValid) {
        this.cms.sendError(res, 400, validation.message, validation.errorCode);
        return;
      }

      this.model.read((readError, items) => {
        if (readError) {
          this.cms.sendError(res, 500, '内容创建失败。', 'CONTENT_CREATE_FAILED');
          return;
        }

        const now = new Date().toISOString();
        const item = {
          id: Date.now(),
          key: payload.key,
          value: payload.value,
          description: payload.description || '',
          createdAt: now,
          updatedAt: now
        };

        items.push(item);
        this.model.write(items, (writeError) => {
          if (writeError) {
            this.cms.sendError(res, 500, '内容创建失败。', 'CONTENT_CREATE_FAILED');
            return;
          }
          this.cms.sendSuccess(res, 200, item, '内容创建成功。');
        });
      });
    });
  }

  update(req, res) {
    const { id } = req.params;

    this.cms.readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      this.model.read((readError, items) => {
        if (readError) {
          this.cms.sendError(res, 500, '内容更新失败。', 'CONTENT_UPDATE_FAILED');
          return;
        }

        const index = items.findIndex(item => item.id === parseInt(id));
        if (index === -1) {
          this.cms.sendError(res, 404, '未找到对应内容。', 'CONTENT_NOT_FOUND');
          return;
        }

        items[index] = {
          ...items[index],
          ...payload,
          updatedAt: new Date().toISOString()
        };

        this.model.write(items, (writeError) => {
          if (writeError) {
            this.cms.sendError(res, 500, '内容更新失败。', 'CONTENT_UPDATE_FAILED');
            return;
          }
          this.cms.sendSuccess(res, 200, items[index], '内容更新成功。');
        });
      });
    });
  }

  delete(req, res) {
    const { id } = req.params;

    this.model.read((readError, items) => {
      if (readError) {
        this.cms.sendError(res, 500, '内容删除失败。', 'CONTENT_DELETE_FAILED');
        return;
      }

      const filtered = items.filter(item => item.id !== parseInt(id));
      this.model.write(filtered, (writeError) => {
        if (writeError) {
          this.cms.sendError(res, 500, '内容删除失败。', 'CONTENT_DELETE_FAILED');
          return;
        }
        this.cms.sendSuccess(res, 200, {}, '内容删除成功。');
      });
    });
  }

  validatePayload(payload) {
    const key = String(payload.key || '').trim();
    const value = payload.value;

    if (!key) {
      return { isValid: false, message: 'key 为必填字段。', errorCode: 'INVALID_PARAMS' };
    }

    if (value === undefined || value === null) {
      return { isValid: false, message: 'value 为必填字段。', errorCode: 'INVALID_PARAMS' };
    }

    return { isValid: true, data: payload };
  }
}

class SettingsController {
  constructor(cms) {
    this.cms = cms;
    this.model = cms.models.settings;
  }

  get(req, res) {
    this.model.read((error, items) => {
      if (error) {
        this.cms.sendError(res, 500, '设置读取失败。', 'SETTINGS_READ_FAILED');
        return;
      }

      const settings = items.length > 0 ? items[0] : {};
      this.cms.sendSuccess(res, 200, settings, '设置获取成功。');
    });
  }

  update(req, res) {
    this.cms.readRequestBody(req, (body) => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch (error) {
        this.cms.sendError(res, 400, '提交数据格式不正确。', 'INVALID_JSON');
        return;
      }

      this.model.read((readError, items) => {
        if (readError) {
          this.cms.sendError(res, 500, '设置更新失败。', 'SETTINGS_UPDATE_FAILED');
          return;
        }

        const now = new Date().toISOString();
        let settings;

        if (items.length > 0) {
          settings = { ...items[0], ...payload, updatedAt: now };
          items[0] = settings;
        } else {
          settings = { ...payload, id: 1, createdAt: now, updatedAt: now };
          items.push(settings);
        }

        this.model.write(items, (writeError) => {
          if (writeError) {
            this.cms.sendError(res, 500, '设置更新失败。', 'SETTINGS_UPDATE_FAILED');
            return;
          }
          this.cms.sendSuccess(res, 200, settings, '设置更新成功。');
        });
      });
    });
  }
}

const cms = new CMS();
cms.init();
cms.start();

export default CMS;
