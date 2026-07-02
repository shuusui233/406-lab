import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const APPLICATIONS_FILE = path.join(__dirname, 'applications.json');

async function migrateProjects() {
  console.log('正在迁移项目数据...');
  
  if (!fs.existsSync(PROJECTS_FILE)) {
    console.log('未找到项目数据文件，跳过迁移');
    return;
  }
  
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
  
  for (const project of projects) {
    try {
      await query(
        'INSERT IGNORE INTO projects (id, title, category, type, description, introduction, cover_url, video_url, image_urls, video_urls, sort_order, visible, show_on_home, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          String(project.id),
          project.title,
          project.category || 'ue',
          project.type || '',
          project.description || '',
          project.introduction || '',
          project.coverUrl || '',
          project.videoUrl || '',
          JSON.stringify(Array.isArray(project.imageUrls) ? project.imageUrls : []),
          JSON.stringify(Array.isArray(project.videoUrls) ? project.videoUrls : []),
          project.sortOrder || 0,
          project.visible !== false ? 1 : 0,
          project.showOnHome ? 1 : 0,
          project.createdAt || new Date().toISOString(),
          project.updatedAt || new Date().toISOString()
        ]
      );
      console.log(`已迁移项目: ${project.title}`);
    } catch (error) {
      console.log(`迁移项目失败 ${project.title}: ${error.message}`);
    }
  }
  
  console.log('项目数据迁移完成');
}

async function migrateUsers() {
  console.log('正在迁移用户数据...');
  
  if (!fs.existsSync(USERS_FILE)) {
    console.log('未找到用户数据文件，跳过迁移');
    return;
  }
  
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  
  for (const user of users) {
    try {
      await query(
        'INSERT IGNORE INTO users (id, username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          user.id || Date.now(),
          user.username,
          user.email,
          user.password,
          user.role || 'user',
          user.createdAt || new Date().toISOString()
        ]
      );
      console.log(`已迁移用户: ${user.username}`);
    } catch (error) {
      console.log(`迁移用户失败 ${user.username}: ${error.message}`);
    }
  }
  
  console.log('用户数据迁移完成');
}

async function migrateApplications() {
  console.log('正在迁移报名数据...');
  
  if (!fs.existsSync(APPLICATIONS_FILE)) {
    console.log('未找到报名数据文件，跳过迁移');
    return;
  }
  
  const applications = JSON.parse(fs.readFileSync(APPLICATIONS_FILE, 'utf8'));
  
  for (const application of applications) {
    try {
      await query(
        'INSERT IGNORE INTO applications (id, name, email, message, created_at) VALUES (?, ?, ?, ?, ?)',
        [
          application.id || Date.now(),
          application.name,
          application.email,
          application.message || '',
          application.createdAt || new Date().toISOString()
        ]
      );
      console.log(`已迁移报名: ${application.name}`);
    } catch (error) {
      console.log(`迁移报名失败 ${application.name}: ${error.message}`);
    }
  }
  
  console.log('报名数据迁移完成');
}

async function main() {
  try {
    await migrateUsers();
    await migrateProjects();
    await migrateApplications();
    console.log('\n✅ 所有数据迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据迁移失败:', error.message);
    process.exit(1);
  }
}

main();
