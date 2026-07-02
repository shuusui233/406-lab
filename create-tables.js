import { query } from './db.js';

async function createTables() {
  console.log('正在创建数据库表结构...');
  
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('users表创建成功');
  
  await query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50) NOT NULL,
      type VARCHAR(100),
      description TEXT,
      introduction TEXT,
      cover_url VARCHAR(500),
      video_url VARCHAR(500),
      image_urls TEXT,
      video_urls TEXT,
      sort_order INT DEFAULT 0,
      visible TINYINT(1) DEFAULT 1,
      show_on_home TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('projects表创建成功');
  
  await query(`
    CREATE TABLE IF NOT EXISTS applications (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('applications表创建成功');
}

async function main() {
  try {
    await createTables();
    console.log('\n✅ 表结构创建完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表结构失败:', error.message);
    process.exit(1);
  }
}

main();
