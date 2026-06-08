const url = require('url');
const { verifyPassword, getOne, getAll, runQuery, saveDatabase, hashPassword } = require('./database');

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

async function requireAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    
    const user = await getOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return false;
    return verifyPassword(password, user.password);
}

// 用户认证
async function handleLogin(req, res) {
    try {
        const body = await parseBody(req);
        const { username, password } = body;
        
        if (!username || !password) {
            sendJson(res, 400, { error: '用户名和密码不能为空' });
            return;
        }

        const user = await getOne('SELECT * FROM users WHERE username = ?', [username]);
        
        if (!user || !verifyPassword(password, user.password)) {
            sendJson(res, 401, { error: '用户名或密码错误' });
            return;
        }

        await runQuery('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);

        sendJson(res, 200, {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (e) {
        console.error('Login error:', e);
        sendJson(res, 400, { error: '请求格式错误' });
    }
}

// 用户列表
async function handleGetUsers(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const users = await getAll('SELECT id, username, email, role, created_at, last_login FROM users');
        sendJson(res, 200, { users });
    } catch (err) {
        console.error('Get users error:', err);
        sendJson(res, 500, { error: '获取用户列表失败' });
    }
}

// 添加用户
async function handleAddUser(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const body = await parseBody(req);
        const { username, password, email, role } = body;
        
        if (!username || !password) {
            sendJson(res, 400, { error: '用户名和密码不能为空' });
            return;
        }

        const existing = await getOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            sendJson(res, 400, { error: '用户名已存在' });
            return;
        }

        const hashedPassword = hashPassword(password);
        await runQuery(
            'INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
            [username, hashedPassword, email || '', role || 'editor']
        );
        
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Add user error:', e);
        sendJson(res, 400, { error: '请求格式错误' });
    }
}

// 更新用户
async function handleUpdateUser(req, res, id) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const body = await parseBody(req);
        const { username, email, role, password } = body;

        const fields = [];
        const params = [];

        if (username) {
            fields.push('username = ?');
            params.push(username);
        }
        if (email) {
            fields.push('email = ?');
            params.push(email);
        }
        if (role) {
            fields.push('role = ?');
            params.push(role);
        }
        if (password) {
            fields.push('password = ?');
            params.push(hashPassword(password));
        }

        if (fields.length === 0) {
            sendJson(res, 400, { error: '没有需要更新的字段' });
            return;
        }

        params.push(id);
        await runQuery(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Update user error:', e);
        sendJson(res, 400, { error: '请求格式错误' });
    }
}

// 删除用户
async function handleDeleteUser(req, res, id) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        await runQuery('DELETE FROM users WHERE id = ?', [id]);
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Delete user error:', e);
        sendJson(res, 400, { error: '删除失败' });
    }
}

// 内容管理
async function handleGetContents(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const contents = await getAll('SELECT * FROM contents ORDER BY id');
        sendJson(res, 200, { contents });
    } catch (err) {
        console.error('Get contents error:', err);
        sendJson(res, 500, { error: '获取内容列表失败' });
    }
}

// 添加内容
async function handleAddContent(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const body = await parseBody(req);
        const { title, key, description, content } = body;
        
        if (!title || !key) {
            sendJson(res, 400, { error: '标题和标识键不能为空' });
            return;
        }

        const existing = await getOne('SELECT id FROM contents WHERE key = ?', [key]);
        if (existing) {
            sendJson(res, 400, { error: '标识键已存在' });
            return;
        }

        await runQuery(
            'INSERT INTO contents (title, key, description, content, updated_at) VALUES (?, ?, ?, ?, datetime("now"))',
            [title, key, description || '', content || '']
        );
        
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Add content error:', e);
        sendJson(res, 400, { error: '请求格式错误' });
    }
}

async function handleUpdateContent(req, res, id) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const body = await parseBody(req);
        const { title, content, description } = body;
        
        await runQuery(
            'UPDATE contents SET title = ?, content = ?, description = ?, updated_at = datetime("now") WHERE id = ?',
            [title, content, description, id]
        );
        
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Update content error:', e);
        sendJson(res, 400, { error: '请求格式错误' });
    }
}

// 删除内容
async function handleDeleteContent(req, res, id) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        await runQuery('DELETE FROM contents WHERE id = ?', [id]);
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Delete content error:', e);
        sendJson(res, 400, { error: '删除失败' });
    }
}

// 系统设置
async function handleGetSettings(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const rows = await getAll('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        sendJson(res, 200, { settings });
    } catch (err) {
        console.error('Get settings error:', err);
        sendJson(res, 500, { error: '获取设置失败' });
    }
}

async function handleUpdateSettings(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const body = await parseBody(req);
        
        for (const [key, value] of Object.entries(body)) {
            const existing = await getOne('SELECT key FROM settings WHERE key = ?', [key]);
            if (existing) {
                await runQuery('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
            } else {
                await runQuery('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
            }
        }
        
        saveDatabase();
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('Update settings error:', e);
        sendJson(res, 400, { error: '请求格式错误' });
    }
}

// 仪表盘统计
async function handleGetStats(req, res) {
    const auth = await requireAuth(req);
    if (!auth) {
        sendJson(res, 401, { error: '未授权' });
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        
        const todayStats = await getOne('SELECT * FROM analytics WHERE date = ?', [today]);
        const totals = await getOne('SELECT SUM(page_views) as total_views, SUM(visitors) as total_visitors FROM analytics');
        
        sendJson(res, 200, {
            pageViews: totals.total_views || 0,
            visitors: totals.total_visitors || 0,
            todayVisits: todayStats ? todayStats.visitors : 0,
            activeUsers: Math.floor(Math.random() * 20) + 5
        });
    } catch (err) {
        console.error('Get stats error:', err);
        sendJson(res, 500, { error: '获取统计失败' });
    }
}

// 路由分发
async function handleApi(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (pathname === '/api/login' && method === 'POST') {
        return handleLogin(req, res);
    }

    // 用户管理
    if (pathname === '/api/users' && method === 'GET') {
        return handleGetUsers(req, res);
    }
    if (pathname === '/api/users' && method === 'POST') {
        return handleAddUser(req, res);
    }
    
    const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (userMatch && method === 'PUT') {
        return handleUpdateUser(req, res, userMatch[1]);
    }
    if (userMatch && method === 'DELETE') {
        return handleDeleteUser(req, res, userMatch[1]);
    }

    // 内容管理
    if (pathname === '/api/contents' && method === 'GET') {
        return handleGetContents(req, res);
    }
    if (pathname === '/api/contents' && method === 'POST') {
        return handleAddContent(req, res);
    }

    const contentMatch = pathname.match(/^\/api\/contents\/(\d+)$/);
    if (contentMatch && method === 'PUT') {
        return handleUpdateContent(req, res, contentMatch[1]);
    }
    if (contentMatch && method === 'DELETE') {
        return handleDeleteContent(req, res, contentMatch[1]);
    }

    // 设置
    if (pathname === '/api/settings' && method === 'GET') {
        return handleGetSettings(req, res);
    }
    if (pathname === '/api/settings' && method === 'PUT') {
        return handleUpdateSettings(req, res);
    }

    // 统计
    if (pathname === '/api/stats' && method === 'GET') {
        return handleGetStats(req, res);
    }

    // 访问统计记录 (公开接口)
    if (pathname === '/api/track' && method === 'POST') {
        const today = new Date().toISOString().split('T')[0];
        const existing = await getOne('SELECT id FROM analytics WHERE date = ?', [today]);
        
        if (existing) {
            await runQuery('UPDATE analytics SET page_views = page_views + 1 WHERE date = ?', [today]);
        } else {
            await runQuery('INSERT INTO analytics (date, page_views, visitors) VALUES (?, 1, 1)', [today]);
        }
        
        saveDatabase();
        sendJson(res, 200, { success: true });
        return;
    }

    // 公开接口：提交联系表单
    if (pathname === '/api/contact' && method === 'POST') {
        try {
            const body = await parseBody(req);
            const { name, email, message } = body;
            
            if (!name || !email || !message) {
                sendJson(res, 400, { error: '姓名、邮箱和留言不能为空' });
                return;
            }

            await runQuery(
                'INSERT INTO contacts (name, email, message, created_at) VALUES (?, ?, ?, datetime("now"))',
                [name, email, message]
            );
            
            saveDatabase();
            sendJson(res, 200, { success: true, message: '留言提交成功！' });
        } catch (e) {
            console.error('Contact form error:', e);
            sendJson(res, 400, { error: '提交失败' });
        }
        return;
    }

    // 公开接口：获取网站设置
    if (pathname === '/api/public/settings' && method === 'GET') {
        try {
            const rows = await getAll('SELECT * FROM settings');
            const settings = {};
            rows.forEach(row => {
                settings[row.key] = row.value;
            });
            sendJson(res, 200, { settings });
        } catch (err) {
            console.error('Get public settings error:', err);
            sendJson(res, 500, { error: '获取设置失败' });
        }
        return;
    }

    // 公开接口：获取内容列表
    if (pathname === '/api/public/contents' && method === 'GET') {
        try {
            const contents = await getAll('SELECT id, title, key, description FROM contents ORDER BY id');
            sendJson(res, 200, { contents });
        } catch (err) {
            console.error('Get public contents error:', err);
            sendJson(res, 500, { error: '获取内容失败' });
        }
        return;
    }

    // 公开接口：获取单个内容
    const publicContentMatch = pathname.match(/^\/api\/public\/contents\/(\w+)$/);
    if (publicContentMatch && method === 'GET') {
        try {
            const content = await getOne('SELECT * FROM contents WHERE key = ?', [publicContentMatch[1]]);
            if (content) {
                sendJson(res, 200, { content });
            } else {
                sendJson(res, 404, { error: '内容不存在' });
            }
        } catch (err) {
            console.error('Get public content error:', err);
            sendJson(res, 500, { error: '获取内容失败' });
        }
        return;
    }

    // 报名提交 - 公开接口
    if (pathname === '/api/applications' && method === 'POST') {
        try {
            const body = await parseBody(req);
            const { name, email, message } = body;
            
            // 参数校验
            if (!name) {
                sendJson(res, 400, { success: false, message: '参数错误', errorCode: 'INVALID_PARAMS' });
                return;
            }
            
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                sendJson(res, 400, { success: false, message: '邮箱格式不正确', errorCode: 'INVALID_PARAMS' });
                return;
            }
            
            if (!message) {
                sendJson(res, 400, { success: false, message: '留言不能为空', errorCode: 'INVALID_PARAMS' });
                return;
            }

            await runQuery(
                'INSERT INTO applications (name, email, message, createdAt) VALUES (?, ?, ?, datetime("now"))',
                [name, email, message]
            );
            
            saveDatabase();
            sendJson(res, 200, { success: true, message: 'ok', data: {} });
        } catch (e) {
            console.error('Application error:', e);
            sendJson(res, 500, { success: false, message: '服务异常', errorCode: 'SERVER_ERROR' });
        }
        return;
    }

    // 报名列表 - 需认证
    if (pathname === '/api/applications' && method === 'GET') {
        const auth = await requireAuth(req);
        if (!auth) {
            sendJson(res, 401, { success: false, message: '未授权', errorCode: 'UNAUTHORIZED' });
            return;
        }

        try {
            const applications = await getAll('SELECT * FROM applications ORDER BY createdAt DESC');
            sendJson(res, 200, { success: true, message: 'ok', data: applications });
        } catch (err) {
            console.error('Get applications error:', err);
            sendJson(res, 500, { success: false, message: '服务异常', errorCode: 'SERVER_ERROR' });
        }
        return;
    }

    // 作品列表 - 公开接口
    if (pathname === '/api/projects' && method === 'GET') {
        try {
            const query = parsedUrl.query || {};
            const category = query.category || '';
            
            let sql = 'SELECT * FROM projects WHERE visible = 1';
            let params = [];
            
            if (category && ['ue', 'ai', 'research'].includes(category)) {
                sql += ' AND category = ?';
                params.push(category);
            }
            
            sql += ' ORDER BY sortOrder ASC';
            
            const projects = await getAll(sql, params);
            sendJson(res, 200, { success: true, message: 'ok', data: projects });
        } catch (err) {
            console.error('Get projects error:', err);
            sendJson(res, 500, { success: false, message: '服务异常', errorCode: 'SERVER_ERROR' });
        }
        return;
    }

    // 作品详情 - 公开接口
    const projectMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
    if (projectMatch && method === 'GET') {
        try {
            const project = await getOne('SELECT * FROM projects WHERE id = ? AND visible = 1', [projectMatch[1]]);
            if (project) {
                sendJson(res, 200, { success: true, message: 'ok', data: project });
            } else {
                sendJson(res, 404, { success: false, message: '数据不存在', errorCode: 'NOT_FOUND' });
            }
        } catch (err) {
            console.error('Get project error:', err);
            sendJson(res, 500, { success: false, message: '服务异常', errorCode: 'SERVER_ERROR' });
        }
        return;
    }

    // 管理端：删除作品
    if (projectMatch && method === 'DELETE') {
        const auth = await requireAuth(req);
        if (!auth) {
            sendJson(res, 401, { success: false, message: '未授权', errorCode: 'UNAUTHORIZED' });
            return;
        }
        try {
            await runQuery('DELETE FROM projects WHERE id = ?', [projectMatch[1]]);
            saveDatabase();
            sendJson(res, 200, { success: true, message: 'ok', data: {} });
        } catch (err) {
            console.error('Delete project error:', err);
            sendJson(res, 500, { success: false, message: '删除失败', errorCode: 'SERVER_ERROR' });
        }
        return;
    }

    // 管理端：添加作品
    if (pathname === '/api/admin/projects' && method === 'POST') {
        const auth = await requireAuth(req);
        if (!auth) {
            sendJson(res, 401, { success: false, message: '未授权', errorCode: 'UNAUTHORIZED' });
            return;
        }

        try {
            const body = await parseBody(req);
            const { title, category, type, description, coverUrl, videoUrl, sortOrder, visible } = body;
            
            if (!title || !category) {
                sendJson(res, 400, { success: false, message: '标题和分类不能为空', errorCode: 'INVALID_PARAMS' });
                return;
            }

            if (!['ue', 'ai', 'research'].includes(category)) {
                sendJson(res, 400, { success: false, message: '分类参数错误', errorCode: 'INVALID_PARAMS' });
                return;
            }

            await runQuery(
                'INSERT INTO projects (title, category, type, description, coverUrl, videoUrl, sortOrder, visible, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
                [title, category, type || '', description || '', coverUrl || '', videoUrl || '', sortOrder || 0, visible !== undefined ? visible : 1]
            );
            
            saveDatabase();
            sendJson(res, 200, { success: true, message: 'ok', data: {} });
        } catch (e) {
            console.error('Add project error:', e);
            sendJson(res, 500, { success: false, message: '添加失败', errorCode: 'SERVER_ERROR' });
        }
        return;
    }

    sendJson(res, 404, { success: false, message: '接口不存在', errorCode: 'NOT_FOUND' });
}

module.exports = { handleApi };
