<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  login,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getContents,
  updateContent,
  getApplications,
  deleteApplication,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getSettings,
  updateSettings
} from '../api/admin';

// 登录状态
const isLoggedIn = ref(false);
const loginForm = reactive({
  username: '',
  password: ''
});
const loginError = ref('');

// 当前激活的菜单
const activeMenu = ref('dashboard');

// 模态框状态
const modal = reactive({
  show: false,
  title: '',
  type: '',
  data: {}
});

// 数据
const users = ref([]);
const contents = ref([]);
const applications = ref([]);
const projects = ref([]);
const settings = reactive({
  siteName: '',
  siteDescription: '',
  contactEmail: '',
  maintenanceMode: false
});

// 表单数据
const userForm = reactive({
  id: null,
  username: '',
  email: '',
  role: 'user',
  password: ''
});

const projectForm = reactive({
  id: null,
  title: '',
  category: 'ue',
  type: '',
  description: '',
  coverUrl: '',
  videoUrl: '',
  sortOrder: 0,
  visible: true
});

// 上传状态
const uploadingCover = ref(false);
const uploadingVideo = ref(false);

const contentForm = reactive({
  key: '',
  value: ''
});

// 分类选项
const categoryOptions = [
  { value: 'ue', label: 'UE互动开发' },
  { value: 'ai', label: 'AI影视创作' },
  { value: 'research', label: '人工智能研究' }
];

// 角色选项
const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' }
];

// 处理登录
async function handleLogin() {
  loginError.value = '';
  const result = await login(loginForm.username, loginForm.password);
  
  if (result.success) {
    localStorage.setItem('adminUser', JSON.stringify(result.data));
    localStorage.setItem('adminAuth', btoa(loginForm.username + ':' + loginForm.password));
    isLoggedIn.value = true;
    await loadAllData();
  } else {
    loginError.value = result.message || '登录失败';
  }
}

// 退出登录
function handleLogout() {
  localStorage.removeItem('adminUser');
  localStorage.removeItem('adminAuth');
  isLoggedIn.value = false;
  loginForm.username = '';
  loginForm.password = '';
}

// 加载所有数据
async function loadAllData() {
  await Promise.all([
    loadUsers(),
    loadContents(),
    loadApplications(),
    loadProjects(),
    loadSettingsData()
  ]);
}

// 加载用户
async function loadUsers() {
  try {
    users.value = await getUsers();
  } catch (err) {
    console.error('加载用户失败:', err);
  }
}

// 加载内容
async function loadContents() {
  try {
    contents.value = await getContents();
  } catch (err) {
    console.error('加载内容失败:', err);
  }
}

// 加载报名
async function loadApplications() {
  try {
    applications.value = await getApplications();
  } catch (err) {
    console.error('加载报名失败:', err);
  }
}

// 加载项目
async function loadProjects() {
  try {
    projects.value = await getProjects();
  } catch (err) {
    console.error('加载项目失败:', err);
  }
}

// 加载设置
async function loadSettingsData() {
  try {
    const data = await getSettings();
    Object.assign(settings, data);
  } catch (err) {
    console.error('加载设置失败:', err);
  }
}

// 打开用户编辑模态框
function openUserModal(user = null) {
  if (user) {
    userForm.id = user.id;
    userForm.username = user.username;
    userForm.email = user.email;
    userForm.role = user.role;
    userForm.password = '';
    modal.title = '编辑用户';
  } else {
    userForm.id = null;
    userForm.username = '';
    userForm.email = '';
    userForm.role = 'user';
    userForm.password = '';
    modal.title = '添加用户';
  }
  modal.type = 'user';
  modal.show = true;
}

// 打开项目编辑模态框
function openProjectModal(project = null) {
  uploadingCover.value = false;
  uploadingVideo.value = false;
  if (project) {
    Object.assign(projectForm, project);
    modal.title = '编辑作品';
  } else {
    projectForm.id = null;
    projectForm.title = '';
    projectForm.category = 'ue';
    projectForm.type = '';
    projectForm.description = '';
    projectForm.coverUrl = '';
    projectForm.videoUrl = '';
    projectForm.sortOrder = 0;
    projectForm.visible = true;
    modal.title = '添加作品';
  }
  modal.type = 'project';
  modal.show = true;
}

// 保存用户
async function saveUser() {
  try {
    if (userForm.id) {
      const data = {
        username: userForm.username,
        email: userForm.email,
        role: userForm.role
      };
      if (userForm.password) {
        data.password = userForm.password;
      }
      await updateUser(userForm.id, data);
    } else {
      await createUser({
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role
      });
    }
    modal.show = false;
    await loadUsers();
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
}

// 保存项目
async function saveProject() {
  try {
    const data = {
      title: projectForm.title,
      category: projectForm.category,
      type: projectForm.type,
      description: projectForm.description,
      coverUrl: projectForm.coverUrl,
      videoUrl: projectForm.videoUrl,
      sortOrder: projectForm.sortOrder,
      visible: projectForm.visible
    };
    
    if (projectForm.id) {
      await updateProject(projectForm.id, data);
    } else {
      await createProject(data);
    }
    modal.show = false;
    await loadProjects();
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
}

// 删除用户
async function handleDeleteUser(id) {
  if (!confirm('确定要删除该用户吗？')) return;
  try {
    await deleteUser(id);
    await loadUsers();
  } catch (err) {
    alert('删除失败: ' + err.message);
  }
}

// 删除报名
async function handleDeleteApplication(id) {
  if (!confirm('确定要删除该报名记录吗？')) return;
  try {
    await deleteApplication(id);
    await loadApplications();
  } catch (err) {
    alert('删除失败: ' + err.message);
  }
}

// 删除项目
async function handleDeleteProject(id) {
  if (!confirm('确定要删除该作品吗？')) return;
  try {
    await deleteProject(id);
    await loadProjects();
  } catch (err) {
    alert('删除失败: ' + err.message);
  }
}

// 保存设置
async function saveSettings() {
  try {
    await updateSettings(settings);
    alert('设置保存成功');
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
}

// 保存内容
async function saveContent(key) {
  try {
    const content = contents.value.find(c => c.key === key);
    if (content) {
      await updateContent(key, { value: content.value });
      alert('保存成功');
    }
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
}

// 关闭模态框
function closeModal() {
  modal.show = false;
}

// 获取分类标签
function getCategoryLabel(category) {
  return categoryOptions.find(c => c.value === category)?.label || category;
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 触发文件上传
function triggerFileUpload(type) {
  const input = document.querySelector(`input[type="file"].file-input[data-type="${type}"]`) || document.querySelector(`input[type="file"]:not([data-type])`);
  if (input) {
    input.click();
  }
}

// 处理文件选择
async function handleFileSelect(event, type) {
  const file = event.target.files?.[0];
  if (file) {
    await uploadFile(file, type);
  }
}

// 处理文件拖放
async function handleFileDrop(event, type) {
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await uploadFile(file, type);
  }
}

// 上传文件
async function uploadFile(file, type) {
  const isCover = type === 'cover';
  
  if (isCover) {
    uploadingCover.value = true;
  } else {
    uploadingVideo.value = true;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      if (isCover) {
        projectForm.coverUrl = result.data.url;
      } else {
        projectForm.videoUrl = result.data.url;
      }
    } else {
      alert(result.message || '上传失败');
    }
  } catch (error) {
    console.error('上传失败:', error);
    alert('上传失败，请重试');
  } finally {
    if (isCover) {
      uploadingCover.value = false;
    } else {
      uploadingVideo.value = false;
    }
  }
}

// 移除封面
function removeCover() {
  projectForm.coverUrl = '';
}

// 移除视频
function removeVideo() {
  projectForm.videoUrl = '';
}

// 获取视频文件名
function getVideoFileName(url) {
  if (!url) return '';
  return url.split('/').pop();
}

// 获取角色标签
function getRoleLabel(role) {
  return roleOptions.find(r => r.value === role)?.label || role;
}

// 获取统计数据
const stats = computed(() => ({
  users: users.value.length,
  applications: applications.value.length,
  projects: projects.value.filter(p => p.visible).length
}));

// 初始化检查登录状态
onMounted(() => {
  const savedUser = localStorage.getItem('adminUser');
  if (savedUser) {
    isLoggedIn.value = true;
    loadAllData();
  }
});
</script>

<template>
  <div class="admin-container">
    <!-- 登录页面 -->
    <div v-if="!isLoggedIn" class="login-page">
      <div class="login-box">
        <h1>管理后台</h1>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" type="text" required placeholder="请输入用户名" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" required placeholder="请输入密码" />
          </div>
          <button type="submit" class="btn-primary">登录</button>
        </form>
        <p v-if="loginError" class="error-message">{{ loginError }}</p>
        <p class="login-hint">用户名: admin / 密码: admin123</p>
      </div>
    </div>

    <!-- 管理后台主界面 -->
    <div v-else class="admin-main">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>406实训室</h2>
          <p>管理后台</p>
        </div>
        <nav class="sidebar-nav">
          <button 
            v-for="item in [
              { key: 'dashboard', label: '仪表盘', icon: '📊' },
              { key: 'users', label: '用户管理', icon: '👥' },
              { key: 'contents', label: '内容管理', icon: '📝' },
              { key: 'applications', label: '报名管理', icon: '📋' },
              { key: 'projects', label: '作品管理', icon: '🎨' },
              { key: 'settings', label: '系统设置', icon: '⚙️' }
            ]"
            :key="item.key"
            :class="['nav-item', { active: activeMenu === item.key }]"
            @click="activeMenu = item.key"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>
        <button class="logout-btn" @click="handleLogout">
          <span>🚪</span> 退出登录
        </button>
      </aside>

      <!-- 主内容区 -->
      <main class="content-area">
        <!-- 顶部导航 -->
        <header class="content-header">
          <h1>{{ {
            dashboard: '仪表盘',
            users: '用户管理',
            contents: '内容管理',
            applications: '报名管理',
            projects: '作品管理',
            settings: '系统设置'
          }[activeMenu] }}</h1>
        </header>

        <!-- 仪表盘 -->
        <div v-if="activeMenu === 'dashboard'" class="dashboard">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.users }}</div>
                <div class="stat-label">用户总数</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📋</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.applications }}</div>
                <div class="stat-label">报名数量</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎨</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.projects }}</div>
                <div class="stat-label">作品数量</div>
              </div>
            </div>
          </div>
          <div class="quick-links">
            <h3>快捷操作</h3>
            <div class="links-grid">
              <button class="link-btn" @click="activeMenu = 'users'; openUserModal()">
                <span>➕</span> 添加用户
              </button>
              <button class="link-btn" @click="activeMenu = 'projects'; openProjectModal()">
                <span>➕</span> 添加作品
              </button>
            </div>
          </div>
        </div>

        <!-- 用户管理 -->
        <div v-if="activeMenu === 'users'" class="section-content">
          <div class="section-header">
            <h2>用户列表</h2>
            <button class="btn-primary" @click="openUserModal()">➕ 添加用户</button>
          </div>
          <div v-if="users.length === 0" class="empty-state">
            <div class="empty-icon">👥</div>
            <p>暂无用户数据</p>
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>{{ getRoleLabel(user.role) }}</td>
                <td>{{ user.createdAt || '-' }}</td>
                <td>
                  <button class="btn-edit" @click="openUserModal(user)">编辑</button>
                  <button class="btn-delete" @click="handleDeleteUser(user.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 内容管理 -->
        <div v-if="activeMenu === 'contents'" class="section-content">
          <div class="section-header">
            <h2>内容列表</h2>
          </div>
          <div v-if="contents.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p>暂无内容数据</p>
          </div>
          <div v-else class="contents-list">
            <div v-for="content in contents" :key="content.key" class="content-item">
              <div class="content-header">
                <span class="content-key">{{ content.key }}</span>
                <button class="btn-save" @click="saveContent(content.key)">保存</button>
              </div>
              <textarea 
                v-model="content.value" 
                class="content-textarea"
                :placeholder="'请输入' + content.key + '的内容'"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- 报名管理 -->
        <div v-if="activeMenu === 'applications'" class="section-content">
          <div class="section-header">
            <h2>报名列表</h2>
            <button class="btn-primary" @click="loadApplications()">🔄 刷新</button>
          </div>
          <div v-if="applications.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无报名数据</p>
          </div>
          <div v-else class="applications-grid">
            <div v-for="app in applications" :key="app.id" class="application-card">
              <div class="app-header">
                <div class="app-avatar">{{ app.name.charAt(0).toUpperCase() }}</div>
                <div class="app-info">
                  <div class="app-name">{{ app.name }}</div>
                  <div class="app-email">{{ app.email }}</div>
                </div>
                <span class="app-id">#{{ app.id }}</span>
              </div>
              <div class="app-message">
                <div class="message-label">💬 留言</div>
                <div class="message-content">{{ app.message }}</div>
              </div>
              <div class="app-footer">
                <span class="app-date">📅 {{ app.createdAt }}</span>
                <button class="btn-delete" @click="handleDeleteApplication(app.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 作品管理 -->
        <div v-if="activeMenu === 'projects'" class="section-content">
          <div class="section-header">
            <div class="header-left">
              <h2>作品列表</h2>
              <p class="section-desc">管理所有项目作品，支持添加、编辑和删除操作</p>
            </div>
            <button class="btn-primary" @click="openProjectModal()">➕ 添加作品</button>
          </div>
          <div v-if="projects.length === 0" class="empty-state">
            <div class="empty-icon">🎨</div>
            <p>暂无作品数据</p>
            <button class="btn-primary" @click="openProjectModal()">立即添加</button>
          </div>
          <div v-else class="projects-grid">
            <div v-for="project in projects" :key="project.id" class="project-card">
              <div class="project-cover-wrapper">
                <div class="project-cover">
                  <img v-if="project.coverUrl" :src="project.coverUrl" :alt="project.title" />
                  <div v-else class="cover-placeholder">
                    <span class="placeholder-icon">🖼️</span>
                    <span class="placeholder-text">{{ project.title }}</span>
                  </div>
                </div>
                <div v-if="project.videoUrl" class="video-badge">🎬</div>
                <div :class="['visibility-indicator', { visible: project.visible }]">
                  {{ project.visible ? '👁️' : '🔒' }}
                </div>
              </div>
              <div class="project-info">
                <div class="project-header">
                  <span :class="['category-badge', `category-${project.category}`]">
                    {{ getCategoryLabel(project.category) }}
                  </span>
                  <span class="type-badge">{{ project.type || '未分类' }}</span>
                </div>
                <h3 class="project-title">{{ project.title }}</h3>
                <p class="project-desc">{{ project.description }}</p>
                <div class="project-footer">
                  <div class="project-meta">
                    <span class="meta-item">📅 {{ formatDate(project.createdAt) }}</span>
                    <span class="meta-item">🔢 排序: {{ project.sortOrder }}</span>
                  </div>
                  <div class="project-actions">
                    <button class="btn-action btn-edit" @click="openProjectModal(project)" title="编辑">
                      ✏️
                    </button>
                    <button class="btn-action btn-delete" @click="handleDeleteProject(project.id)" title="删除">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统设置 -->
        <div v-if="activeMenu === 'settings'" class="section-content">
          <div class="section-header">
            <h2>系统设置</h2>
          </div>
          <div class="settings-form">
            <div class="form-group">
              <label>网站名称</label>
              <input v-model="settings.siteName" type="text" />
            </div>
            <div class="form-group">
              <label>网站描述</label>
              <textarea v-model="settings.siteDescription"></textarea>
            </div>
            <div class="form-group">
              <label>联系邮箱</label>
              <input v-model="settings.contactEmail" type="email" />
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="settings.maintenanceMode" type="checkbox" />
                <span>维护模式</span>
              </label>
            </div>
            <button class="btn-primary" @click="saveSettings()">保存设置</button>
          </div>
        </div>
      </main>
    </div>

    <!-- 模态框 -->
    <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modal.title }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <!-- 用户表单 -->
          <div v-if="modal.type === 'user'" class="modal-form">
            <div class="form-group">
              <label>用户名 *</label>
              <input v-model="userForm.username" type="text" required />
            </div>
            <div class="form-group">
              <label>邮箱 *</label>
              <input v-model="userForm.email" type="email" required />
            </div>
            <div class="form-group">
              <label>角色</label>
              <select v-model="userForm.role">
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">{{ role.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ userForm.id ? '新密码（不填则不变）' : '密码 *' }}</label>
              <input v-model="userForm.password" type="password" :required="!userForm.id" />
            </div>
          </div>

          <!-- 项目表单 -->
          <div v-if="modal.type === 'project'" class="modal-form">
            <div class="form-group">
              <label>标题 *</label>
              <input v-model="projectForm.title" type="text" required />
            </div>
            <div class="form-group">
              <label>分类</label>
              <select v-model="projectForm.category">
                <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>类型</label>
              <input v-model="projectForm.type" type="text" />
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="projectForm.description"></textarea>
            </div>
            <div class="form-group">
              <label>封面图片</label>
              <div class="upload-area" @click="triggerFileUpload('cover')" @dragover.prevent @drop.prevent="handleFileDrop($event, 'cover')">
                <input ref="coverInput" type="file" accept="image/*" class="file-input" @change="handleFileSelect($event, 'cover')" />
                <div v-if="projectForm.coverUrl && !uploadingCover" class="upload-preview">
                  <img :src="projectForm.coverUrl" />
                  <button class="remove-btn" @click.stop="removeCover">✕</button>
                </div>
                <div v-else-if="uploadingCover" class="upload-loading">
                  <div class="spinner"></div>
                  <span>上传中...</span>
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">🖼️</span>
                  <span>点击或拖拽上传封面图片</span>
                  <span class="upload-hint">支持 JPG、PNG 格式</span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>视频文件</label>
              <div class="upload-area" @click="triggerFileUpload('video')" @dragover.prevent @drop.prevent="handleFileDrop($event, 'video')">
                <input ref="videoInput" type="file" accept="video/*" class="file-input" @change="handleFileSelect($event, 'video')" />
                <div v-if="projectForm.videoUrl && !uploadingVideo" class="upload-preview video-preview">
                  <div class="video-icon">🎬</div>
                  <div class="video-info">
                    <span>{{ getVideoFileName(projectForm.videoUrl) }}</span>
                  </div>
                  <button class="remove-btn" @click.stop="removeVideo">✕</button>
                </div>
                <div v-else-if="uploadingVideo" class="upload-loading">
                  <div class="spinner"></div>
                  <span>上传中...</span>
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">🎥</span>
                  <span>点击或拖拽上传视频文件</span>
                  <span class="upload-hint">支持 MP4、WebM 格式</span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>排序值</label>
              <input v-model.number="projectForm.sortOrder" type="number" />
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="projectForm.visible" type="checkbox" />
                <span>设为可见</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModal">取消</button>
          <button class="btn-primary" @click="modal.type === 'user' ? saveUser() : saveProject()">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #f5f5f7;
}

/* 登录页面 */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #1a1a2e;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
  background: #ffffff;
  color: #333333;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.login-page .form-group input::placeholder {
  color: #999;
}

.login-page input:-webkit-autofill,
.login-page input:-webkit-autofill:hover,
.login-page input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px white inset;
  -webkit-text-fill-color: #333;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.error-message {
  color: #e74c3c;
  text-align: center;
  margin-top: 15px;
}

.login-hint {
  text-align: center;
  margin-top: 20px;
  color: #888;
  font-size: 13px;
}

/* 后台主界面 */
.admin-main {
  display: flex;
  min-height: 100vh;
}

/* 侧边栏 */
.sidebar {
  width: 250px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px;
  color: white;
}

.sidebar-header {
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
}

.sidebar-header p {
  margin: 5px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-size: 14px;
}

.logout-btn {
  margin-top: auto;
  width: 100%;
  padding: 12px;
  border: none;
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 30px;
}

.logout-btn:hover {
  background: rgba(231, 76, 60, 0.3);
}

/* 主内容区 */
.content-area {
  flex: 1;
  padding: 20px;
}

.content-header {
  margin-bottom: 20px;
}

.content-header h1 {
  margin: 0;
  color: #1a1a2e;
}

/* 仪表盘 */
.dashboard {
  margin-bottom: 30px;
}

/* 文件上传区域 */
.upload-area {
  position: relative;
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.upload-area.dragover {
  border-color: #667eea;
  background: #f0f4ff;
}

.file-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #666;
}

.upload-icon {
  font-size: 48px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.upload-preview {
  position: relative;
  max-height: 200px;
  overflow: hidden;
  border-radius: 8px;
}

.upload-preview img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
}

.video-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #1a1a2e;
  color: white;
  padding: 16px;
}

.video-icon {
  font-size: 40px;
}

.video-info {
  flex: 1;
  text-align: left;
}

.video-info span {
  font-size: 14px;
  color: #aaa;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-btn:hover {
  background: rgba(231, 76, 60, 0.8);
}

.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #667eea;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a2e;
}

.stat-label {
  color: #888;
  font-size: 14px;
}

.quick-links {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.quick-links h3 {
  margin: 0 0 20px;
  color: #1a1a2e;
}

.links-grid {
  display: flex;
  gap: 12px;
}

.link-btn {
  padding: 12px 24px;
  border: 2px dashed #667eea;
  background: transparent;
  color: #667eea;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.link-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

/* 通用区域样式 */
.section-content {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: #1a1a2e;
}

.section-header .btn-primary {
  width: auto;
  padding: 10px 20px;
  font-size: 14px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-desc {
  margin: 0;
  font-size: 14px;
  color: #999;
  font-weight: normal;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #888;
}

/* 数据表 */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f8fa;
  font-weight: 600;
  color: #333;
}

.data-table tr:hover {
  background: #f8f8fa;
}

.btn-edit,
.btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  margin-right: 8px;
}

.btn-edit {
  background: #667eea;
  color: white;
}

.btn-edit:hover {
  background: #5a6fd6;
}

.btn-delete {
  background: #fee;
  color: #e74c3c;
}

.btn-delete:hover {
  background: #fdd;
}

.btn-save {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background: #27ae60;
  color: white;
}

.btn-save:hover {
  background: #2ecc71;
}

/* 内容列表 */
.contents-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-item {
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f8fa;
}

.content-key {
  font-weight: 600;
  color: #333;
}

.content-textarea {
  width: 100%;
  padding: 16px;
  border: none;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  box-sizing: border-box;
}

.content-textarea:focus {
  outline: none;
}

/* 报名卡片 */
.applications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.application-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #667eea;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.app-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.app-info {
  flex: 1;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
}

.app-email {
  font-size: 14px;
  color: #888;
}

.app-id {
  font-size: 12px;
  color: #aaa;
  background: #f5f5f7;
  padding: 4px 10px;
  border-radius: 12px;
}

.app-message {
  background: #f8f8fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.message-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.message-content {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f5;
}

.app-date {
  font-size: 13px;
  color: #aaa;
}

/* 作品卡片 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f5;
}

.project-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  border-color: rgba(102, 126, 234, 0.2);
}

.project-cover-wrapper {
  position: relative;
  height: 200px;
}

.project-cover {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.project-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.project-card:hover .project-cover img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f59e0b 100%);
  color: white;
  text-align: center;
  padding: 20px;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.9;
}

.placeholder-text {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.video-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.visibility-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  font-size: 14px;
  backdrop-filter: blur(4px);
}

.visibility-indicator.visible {
  background: rgba(34, 197, 94, 0.8);
}

.project-info {
  padding: 20px;
}

.project-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.category-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.category-ue {
  background: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
}

.category-ai {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.category-research {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.type-badge {
  padding: 4px 12px;
  background: #f5f5f7;
  color: #666;
  border-radius: 20px;
  font-size: 12px;
}

.project-title {
  margin: 0 0 10px;
  color: #1a1a2e;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

.project-desc {
  margin: 0 0 16px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f5;
}

.project-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  font-size: 12px;
  color: #999;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-action.btn-edit {
  background: #f0f5ff;
  color: #667eea;
}

.btn-action.btn-edit:hover {
  background: #e0eaff;
  transform: scale(1.05);
}

.btn-action.btn-delete {
  background: #fff0f0;
  color: #e74c3c;
}

.btn-action.btn-delete:hover {
  background: #ffe0e0;
  transform: scale(1.05);
}

/* 设置表单 */
.settings-form {
  max-width: 600px;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.btn-secondary {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #f8f8fa;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #1a1a2e;
}

.modal-close {
  border: none;
  background: none;
  font-size: 20px;
  cursor: pointer;
  color: #888;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #eee;
}

.modal-footer .btn-primary,
.modal-footer .btn-secondary {
  width: auto;
}
</style>