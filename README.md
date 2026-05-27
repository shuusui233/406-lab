# 406实训室官网

这是406实训室的官方网站项目。

## 项目结构

```
406/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── main.js         # JavaScript脚本
├── 406实训室招新宣讲.pptx  # 原始PPT文件
└── README.md           # 项目说明
```

## 如何使用

1. 直接在浏览器中打开 `index.html` 文件即可查看网站
2. 或者使用本地服务器运行：

```bash
# 使用Python
python -m http.server 8000

# 或者使用Node.js的http-server
npx http-server
```

然后在浏览器访问 `http://localhost:8000`

## 网站功能

- 响应式设计，支持移动端和桌面端
- 导航栏（首页、关于我们、项目展示、团队成员、招新信息、联系我们）
- 滚动动画效果
- 联系表单
- 移动端汉堡菜单

## 下一步

根据PPT内容，你可以：

1. 修改 `index.html` 中的文本内容
2. 替换占位图片
3. 更新颜色主题（在 `css/style.css` 的 `:root` 中修改）
4. 添加更多项目和团队成员
5. 完善招新信息
