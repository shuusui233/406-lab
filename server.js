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
const DIST_DIR = path.join(__dirname, 'dist');
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
  let body = '';

  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    callback(body);
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
