// 管理后台脚本
document.addEventListener('DOMContentLoaded', function() {
    const loginPage = document.getElementById('loginPage');
    const adminPage = document.getElementById('adminPage');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    // 模态框元素
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalClose = document.querySelector('.modal-close');
    const modalSave = document.getElementById('modalSave');

    // 检查是否已登录
    const savedUser = sessionStorage.getItem('adminUser');
    if (savedUser) {
        showAdminPage();
        loadDashboardData();
    }

    // 登录表单提交
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (data.success) {
                sessionStorage.setItem('adminUser', JSON.stringify(data.user));
                sessionStorage.setItem('adminAuth', btoa(username + ':' + password));
                showAdminPage();
                loadDashboardData();
                loadUsers();
                loadContents();
                loadSettings();
                loadApplications();
                window.loadProjects();
            } else {
                loginError.textContent = data.error || '登录失败';
            }
        } catch (err) {
            loginError.textContent = '网络错误，请重试';
        }
    });

    // 退出登录
    logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminAuth');
        showLoginPage();
    });

    // 导航切换
    navItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            
            navItems.forEach(function(nav) {
                nav.classList.remove('active');
            });
            this.classList.add('active');
            
            contentSections.forEach(function(sec) {
                sec.classList.remove('active');
            });
            document.getElementById(section).classList.add('active');

            // 加载对应模块数据
            if (section === 'dashboard') loadDashboardData();
            if (section === 'content') loadContents();
            if (section === 'settings') loadSettings();
            if (section === 'users') loadUsers();
            if (section === 'applications') loadApplications();
            if (section === 'projects') window.loadProjects();
        });
    });

    function showLoginPage() {
        loginPage.style.display = 'flex';
        adminPage.style.display = 'none';
    }

    function showAdminPage() {
        loginPage.style.display = 'none';
        adminPage.style.display = 'flex';
    }

    // 获取认证头
    function getAuthHeader() {
        return 'Basic ' + sessionStorage.getItem('adminAuth');
    }

    // 显示模态框
    function showModal(title, content, onSave) {
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modal.style.display = 'block';
        
        modalSave.onclick = async function() {
            await onSave();
            modal.style.display = 'none';
        };
    }

    // 关闭模态框
    modalClose.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 加载仪表盘数据
    async function loadDashboardData() {
        try {
            const response = await fetch('/api/stats', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            
            if (data.pageViews !== undefined) {
                document.getElementById('pageViews').textContent = data.pageViews.toLocaleString();
                document.getElementById('visitors').textContent = data.visitors.toLocaleString();
                document.getElementById('todayVisits').textContent = data.todayVisits.toLocaleString();
                document.getElementById('activeUsers').textContent = data.activeUsers;
            }
        } catch (err) {
            console.error('加载统计数据失败:', err);
        }
    }

    // 加载内容列表
    async function loadContents() {
        try {
            const response = await fetch('/api/contents', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            
            if (data.contents) {
                const contentList = document.querySelector('.content-list');
                contentList.innerHTML = data.contents.map(item => `
                    <div class="content-item" data-id="${item.id}">
                        <div class="content-info">
                            <h4>${escapeHtml(item.title)}</h4>
                            <p>${escapeHtml(item.description || '')}</p>
                        </div>
                        <div class="content-actions">
                            <button class="btn-edit" onclick="window.editContent(${item.id})">编辑</button>
                            <button class="btn-delete" onclick="window.deleteContent(${item.id})">删除</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('加载内容列表失败:', err);
        }
    }

    // 编辑内容
    window.editContent = async function(id) {
        try {
            const response = await fetch('/api/contents', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            const content = data.contents.find(c => c.id === id);
            
            if (content) {
                showModal('编辑内容', `
                    <input type="hidden" id="editContentId" value="${content.id}">
                    <div class="form-group">
                        <label>标题:</label>
                        <input type="text" id="editTitle" value="${escapeHtml(content.title)}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>标识键:</label>
                        <input type="text" id="editKey" value="${escapeHtml(content.key)}" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label>描述:</label>
                        <input type="text" id="editDescription" value="${escapeHtml(content.description || '')}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>内容:</label>
                        <textarea id="editContentText" class="form-control" rows="4">${escapeHtml(content.content || '')}</textarea>
                    </div>
                `, async function() {
                    const updateData = {
                        title: document.getElementById('editTitle').value,
                        description: document.getElementById('editDescription').value,
                        content: document.getElementById('editContentText').value
                    };
                    
                    const response = await fetch(`/api/contents/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': getAuthHeader()
                        },
                        body: JSON.stringify(updateData)
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('内容更新成功');
                        loadContents();
                    } else {
                        alert('更新失败');
                    }
                });
            }
        } catch (err) {
            console.error('编辑内容失败:', err);
        }
    };

    // 删除内容
    window.deleteContent = async function(id) {
        if (!confirm('确定要删除这条内容吗？')) return;
        
        try {
            const response = await fetch(`/api/contents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getAuthHeader() }
            });
            const result = await response.json();
            
            if (result.success) {
                alert('内容已删除');
                loadContents();
            } else {
                alert('删除失败');
            }
        } catch (err) {
            console.error('删除内容失败:', err);
        }
    };

    // 添加内容
    window.addContent = function() {
        showModal('添加内容', `
            <div class="form-group">
                <label>标题:</label>
                <input type="text" id="addTitle" class="form-control" placeholder="输入标题">
            </div>
            <div class="form-group">
                <label>标识键:</label>
                <input type="text" id="addKey" class="form-control" placeholder="输入唯一标识">
            </div>
            <div class="form-group">
                <label>描述:</label>
                <input type="text" id="addDescription" class="form-control" placeholder="输入描述">
            </div>
        `, async function() {
            const newContent = {
                title: document.getElementById('addTitle').value,
                key: document.getElementById('addKey').value,
                description: document.getElementById('addDescription').value
            };
            
            try {
                const response = await fetch('/api/contents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': getAuthHeader()
                    },
                    body: JSON.stringify(newContent)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('内容添加成功');
                    loadContents();
                } else {
                    alert('添加失败: ' + result.error);
                }
            } catch (err) {
                alert('添加失败');
            }
        });
    };

    // 加载系统设置
    async function loadSettings() {
        try {
            const response = await fetch('/api/settings', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            
            if (data.settings) {
                document.getElementById('siteName').value = data.settings.site_name || '';
                document.getElementById('siteDescription').value = data.settings.site_description || '';
                document.getElementById('contactEmail').value = data.settings.contact_email || '';
                document.getElementById('maintenanceMode').checked = data.settings.maintenance_mode === 'true';
            }
        } catch (err) {
            console.error('加载设置失败:', err);
        }
    }

    // 加载用户列表
    async function loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            
            if (data.users) {
                const tbody = document.getElementById('usersTableBody');
                tbody.innerHTML = data.users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${escapeHtml(user.username)}</td>
                        <td>${escapeHtml(user.email || '')}</td>
                        <td><span class="role-badge ${user.role}">${user.role === 'admin' ? '管理员' : '编辑'}</span></td>
                        <td>${user.last_login || '-'}</td>
                        <td>
                            <button class="btn-edit" onclick="window.editUser(${user.id})">编辑</button>
                            <button class="btn-delete" onclick="window.deleteUser(${user.id})">删除</button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error('加载用户列表失败:', err);
        }
    }

    // 编辑用户
    window.editUser = async function(id) {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            const user = data.users.find(u => u.id === id);
            
            if (user) {
                showModal('编辑用户', `
                    <input type="hidden" id="editUserId" value="${user.id}">
                    <div class="form-group">
                        <label>用户名:</label>
                        <input type="text" id="editUsername" value="${escapeHtml(user.username)}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>邮箱:</label>
                        <input type="email" id="editEmail" value="${escapeHtml(user.email || '')}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>角色:</label>
                        <select id="editRole" class="form-control">
                            <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>编辑</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>新密码（留空不修改）:</label>
                        <input type="password" id="editPassword" class="form-control" placeholder="输入新密码">
                    </div>
                `, async function() {
                    const updateData = {
                        username: document.getElementById('editUsername').value,
                        email: document.getElementById('editEmail').value,
                        role: document.getElementById('editRole').value,
                        password: document.getElementById('editPassword').value
                    };
                    
                    const response = await fetch(`/api/users/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': getAuthHeader()
                        },
                        body: JSON.stringify(updateData)
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('用户更新成功');
                        loadUsers();
                    } else {
                        alert('更新失败');
                    }
                });
            }
        } catch (err) {
            console.error('编辑用户失败:', err);
        }
    };

    // 删除用户
    window.deleteUser = async function(id) {
        if (!confirm('确定要删除这个用户吗？')) return;
        
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getAuthHeader() }
            });
            const result = await response.json();
            
            if (result.success) {
                alert('用户已删除');
                loadUsers();
            } else {
                alert('删除失败');
            }
        } catch (err) {
            console.error('删除用户失败:', err);
        }
    };

    // 添加用户
    window.addUser = function() {
        showModal('添加用户', `
            <div class="form-group">
                <label>用户名:</label>
                <input type="text" id="addUsername" class="form-control" placeholder="输入用户名">
            </div>
            <div class="form-group">
                <label>邮箱:</label>
                <input type="email" id="addEmail" class="form-control" placeholder="输入邮箱">
            </div>
            <div class="form-group">
                <label>密码:</label>
                <input type="password" id="addPassword" class="form-control" placeholder="输入密码">
            </div>
            <div class="form-group">
                <label>角色:</label>
                <select id="addRole" class="form-control">
                    <option value="editor">编辑</option>
                    <option value="admin">管理员</option>
                </select>
            </div>
        `, async function() {
            const newUser = {
                username: document.getElementById('addUsername').value,
                email: document.getElementById('addEmail').value,
                password: document.getElementById('addPassword').value,
                role: document.getElementById('addRole').value
            };
            
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': getAuthHeader()
                    },
                    body: JSON.stringify(newUser)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('用户添加成功');
                    loadUsers();
                } else {
                    alert('添加失败: ' + result.error);
                }
            } catch (err) {
                alert('添加失败');
            }
        });
    };

    // 保存设置
    const saveSettingsBtn = document.querySelector('.btn-save');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async function() {
            const settings = {
                site_name: document.getElementById('siteName').value,
                site_description: document.getElementById('siteDescription').value,
                contact_email: document.getElementById('contactEmail').value,
                maintenance_mode: document.getElementById('maintenanceMode').checked ? 'true' : 'false'
            };

            try {
                const response = await fetch('/api/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': getAuthHeader()
                    },
                    body: JSON.stringify(settings)
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('设置已保存');
                    loadSettings();
                } else {
                    alert('保存失败');
                }
            } catch (err) {
                alert('网络错误');
            }
        });
    }

    // HTML 转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 加载报名列表
    async function loadApplications() {
        try {
            const response = await fetch('/api/applications', {
                headers: { 'Authorization': getAuthHeader() }
            });
            const data = await response.json();
            
            if (data.success && Array.isArray(data.data)) {
                const tbody = document.getElementById('applicationsTableBody');
                if (data.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">暂无报名数据</td></tr>';
                } else {
                    tbody.innerHTML = data.data.map(app => `
                        <tr>
                            <td>${app.id}</td>
                            <td>${escapeHtml(app.name)}</td>
                            <td>${escapeHtml(app.email)}</td>
                            <td>${escapeHtml(app.message)}</td>
                            <td>${escapeHtml(app.createdAt || '')}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('加载报名列表失败:', err);
        }
    }

    // 刷新报名列表
    window.refreshApplications = function() {
        loadApplications();
    };

    // 加载作品列表
    window.loadProjects = async function() {
        try {
            const category = document.getElementById('projectCategoryFilter').value;
            const url = category ? `/api/projects?category=${category}` : '/api/projects';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && Array.isArray(data.data)) {
                const tbody = document.getElementById('projectsTableBody');
                if (data.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">暂无作品数据</td></tr>';
                } else {
                    const categoryMap = { ue: 'UE互动开发', ai: 'AI影视创作', research: '人工智能研究' };
                    tbody.innerHTML = data.data.map(project => `
                        <tr>
                            <td>${project.id}</td>
                            <td>${escapeHtml(project.title)}</td>
                            <td>${categoryMap[project.category] || project.category}</td>
                            <td>${escapeHtml(project.type || '-')}</td>
                            <td>${project.sortOrder}</td>
                            <td>${project.visible == 1 ? '✓' : '✗'}</td>
                            <td>
                                <button class="btn-delete" onclick="window.deleteProject(${project.id})">删除</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('加载作品列表失败:', err);
        }
    };

    // 删除作品（通过后端管理接口）
    window.deleteProject = async function(id) {
        if (!confirm('确定要删除这个作品吗？')) return;
        
        // 由于公开接口只提供 GET，这里通过后端管理接口
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getAuthHeader() }
            });
            const result = await response.json();
            
            if (result.success) {
                alert('作品已删除');
                window.loadProjects();
            } else {
                alert('删除失败: ' + (result.message || '未知错误'));
            }
        } catch (err) {
            console.error('删除作品失败:', err);
            alert('删除失败');
        }
    };

    // 添加作品
    window.addProject = function() {
        showModal('添加作品', `
            <div class="form-group">
                <label>标题:</label>
                <input type="text" id="addProjectTitle" class="form-control" placeholder="输入作品标题">
            </div>
            <div class="form-group">
                <label>分类:</label>
                <select id="addProjectCategory" class="form-control">
                    <option value="ue">UE互动开发</option>
                    <option value="ai">AI影视创作</option>
                    <option value="research">人工智能研究</option>
                </select>
            </div>
            <div class="form-group">
                <label>类型:</label>
                <input type="text" id="addProjectType" class="form-control" placeholder="如：VR/数字孪生">
            </div>
            <div class="form-group">
                <label>描述:</label>
                <textarea id="addProjectDescription" class="form-control" rows="3" placeholder="输入作品描述"></textarea>
            </div>
            <div class="form-group">
                <label>封面URL:</label>
                <input type="text" id="addProjectCover" class="form-control" placeholder="封面图片URL">
            </div>
            <div class="form-group">
                <label>视频URL:</label>
                <input type="text" id="addProjectVideo" class="form-control" placeholder="视频文件URL">
            </div>
            <div class="form-group">
                <label>排序:</label>
                <input type="number" id="addProjectSort" class="form-control" value="0">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="addProjectVisible" checked>
                    是否可见
                </label>
            </div>
        `, async function() {
            const newProject = {
                title: document.getElementById('addProjectTitle').value,
                category: document.getElementById('addProjectCategory').value,
                type: document.getElementById('addProjectType').value,
                description: document.getElementById('addProjectDescription').value,
                coverUrl: document.getElementById('addProjectCover').value,
                videoUrl: document.getElementById('addProjectVideo').value,
                sortOrder: parseInt(document.getElementById('addProjectSort').value) || 0,
                visible: document.getElementById('addProjectVisible').checked ? 1 : 0
            };
            
            try {
                const response = await fetch('/api/admin/projects', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': getAuthHeader()
                    },
                    body: JSON.stringify(newProject)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('作品添加成功');
                    window.loadProjects();
                } else {
                    alert('添加失败: ' + (result.message || '未知错误'));
                }
            } catch (err) {
                alert('添加失败');
            }
        });
    };
});
