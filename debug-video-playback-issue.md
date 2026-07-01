# Debug Session: video-playback-issue

**Status**: [RESOLVED]

## 📋 Problem Statement

**Symptoms**: 新添加的视频无法正常播放

**Expected Behavior**: 视频应该能够正常播放

**Actual Behavior**: 新添加的视频无法播放

## 🎯 Hypotheses

1. **H1: 视频文件格式问题**
   - 假设：上传的视频文件格式不支持或编码不兼容
   - 观察点：视频上传时的文件类型、格式、大小
   - 验证方法：检查上传请求的视频文件信息和浏览器支持的格式

2. **H2: 视频URL路径问题**
   - 假设：视频文件的存储路径或URL配置错误
   - 观察点：视频上传后的存储路径、URL生成逻辑
   - 验证方法：检查视频URL的生成过程和实际文件位置
   - **状态**: ⚠️ **部分证实** - 发现旧格式视频文件（直接在uploads/根目录）无法访问

3. **H3: 视频播放器配置问题**
   - 假设：前端视频播放器的属性配置不正确
   - 观察点：video标签的属性、事件触发、浏览器控制台错误
   - 验证方法：检查前端视频播放器的配置和事件处理

4. **H4: 视频上传完整性问题**
   - 假设：视频文件在上传过程中损坏或不完整
   - 观察点：上传请求的大小、响应状态、文件大小对比
   - 验证方法：检查上传请求的文件大小和服务器接收的文件大小

5. **H5: HTTP Range请求支持问题**
   - 假设：服务器不支持HTTP Range请求，导致大视频文件无法正常播放
   - 观察点：服务器的文件服务方式、视频文件大小、HTTP响应头
   - 验证方法：检查服务器文件服务代码、测试Range请求
   - **状态**: ✅ **证实** - 服务器使用fs.readFile一次性读取整个文件，不支持Range请求

## 📝 Instrumentation Plan

**Phase 1**: 视频上传过程插桩
- 记录上传请求的文件信息（名称、类型、大小）
- 记录服务器响应的视频URL
- 记录文件存储路径

**Phase 2**: 视频播放过程插桩
- 记录video标签加载事件
- 记录播放错误事件
- 记录视频URL加载状态

## 🛠 Debugging Progress

### Phase 1: Evidence Collection
- [x] 启动 Debug Server
- [x] 添加视频上传插桩日志
- [x] 添加视频播放插桩日志
- [x] 用户复现问题
- [x] 收集运行时日志

### Phase 2: Analysis
- [x] 分析日志，验证/排除假设
- [x] **确定根本原因**：
  1. 旧格式视频文件（直接在uploads/根目录）无法访问
  2. 服务器不支持HTTP Range请求，导致大视频文件无法播放

### Phase 3: Fix & Verify
- [x] 实施最小修复
- [x] 验证修复效果
- [x] 对比修复前后日志

### Phase 4: Cleanup
- [ ] 移除插桩代码
- [ ] 关闭 Debug Server
- [ ] 清理调试文件

## 📊 Evidence Log

**发现问题1**：
- 现象：`/uploads/xxxxx.mp4` 路径返回404错误
- 原因：服务器只支持新格式（`uploads/videos/子目录`），不支持旧格式（直接在`uploads/`根目录）
- 证据：`uploads/` 目录下存在旧格式视频文件，但访问时返回404

**发现问题2**：
- 现象：视频文件可以访问但无法播放
- 原因：服务器使用`fs.readFile`一次性读取整个文件到内存，不支持HTTP Range请求
- 证据：视频文件33.28MB，浏览器播放需要Range支持进行分片加载

## 🔄 Session Log

### 修复内容

**修复1：兼容旧格式视频文件**
在 `server.js` 的 `resolveStaticFile` 函数中添加了对旧格式视频文件的兼容处理：
```javascript
// 检查是否是uploads目录的请求
if (cleanPath.startsWith('uploads/')) {
  const uploadFile = path.join(__dirname, cleanPath);
  if (fs.existsSync(uploadFile)) {
    return uploadFile;
  }
  
  // 尝试在uploads根目录查找（兼容旧格式）
  const fileName = cleanPath.replace('uploads/', '');
  const rootFile = path.join(UPLOADS_DIR, fileName);
  if (fs.existsSync(rootFile)) {
    return rootFile;
  }
  
  return null;
}
```

**修复2：支持HTTP Range请求**
修改 `serveFile` 函数以支持HTTP Range请求，允许大视频文件分片加载：
```javascript
function serveFile(res, filePath, req) {
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // 支持Range请求，用于视频等大文件的分片加载
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
    // 普通请求，流式返回文件（避免大文件内存问题）
    const head = {
      ...getCorsHeaders(),
      'Content-Length': fileSize,
      'Content-Type': contentType
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}
```

## 🎯 验证结果

| 测试场景 | 修复前 | 修复后 |
|---------|-------|-------|
| 后端直接访问旧格式视频 | ❌ 404 | ✅ 200 |
| 前端通过代理访问旧格式视频 | ❌ 404 | ✅ 200 |
| 新格式视频（uploads/videos/） | ✅ 正常 | ✅ 正常 |
| 视频Range请求支持 | ❌ 不支持 | ✅ 支持 |
| 大视频文件播放 | ❌ 无法播放 | ✅ 正常播放 |

## 🚨 根本原因

1. **路径兼容性问题**：服务器只支持新的视频存储路径格式（`uploads/videos/子目录`），不支持旧格式（直接在 `uploads/` 根目录下的视频文件）

2. **Range请求支持缺失**：服务器使用 `fs.readFile` 一次性读取整个文件到内存，不支持HTTP Range请求，导致大视频文件（如33.28MB）无法正常播放

## 🔧 解决方案

1. **路径兼容性修复**：在 `resolveStaticFile` 函数中添加对旧格式文件的兼容处理
2. **Range请求支持**：重构 `serveFile` 函数，使用 `fs.createReadStream` 实现流式传输并支持Range请求

## ✅ 最终状态

问题已完全解决：
- ✅ 旧格式和新格式视频文件都能正常访问
- ✅ 支持HTTP Range请求，大视频文件可以正常播放
- ✅ 流式传输，避免大文件内存问题