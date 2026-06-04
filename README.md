# 信核数据党群平台

这是一个基于 GitHub Pages 的静态站点项目，用于展示信核数据党支部新闻动态、图片新闻、组织风采和党建成果。

站点采用纯前端实现，无需独立服务器，适合用于公开展示和长期维护。

## 项目结构

```text
.
├── index.html              首页
├── admin.html              新闻内容录入页
├── styles.css              页面样式
├── script.js               新闻数据加载与录入页逻辑
├── data/
│   └── news.json           新闻数据文件
└── assets/
    └── uploads/            图片资源目录
```

## 功能说明

- 首页展示党支部新闻动态、图片新闻专区、组织风采和党建成果板块
- 通过 `data/news.json` 统一管理新闻内容
- 提供 `admin.html` 辅助录入新闻标题、摘要、正文、日期和图片路径
- 支持将图片放入 `assets/uploads/` 目录后在页面中引用

## 内容维护方式

### 1. 上传图片

将新闻图片放入：

```text
assets/uploads/
```

建议命名方式：

```text
assets/uploads/news-01.jpg
assets/uploads/news-02.jpg
```

### 2. 录入新闻内容

打开本地页面：

```text
admin.html
```

填写以下内容：

- 新闻标题
- 新闻分类
- 发布日期
- 摘要
- 正文
- 图片路径

提交后，页面会生成一段 JSON 数据。

### 3. 更新新闻数据

将生成的 JSON 对象追加到 `data/news.json` 数组中，例如：

```json
{
  "id": "2026-06-04-news-demo",
  "title": "信核数据党支部开展专题学习交流活动",
  "category": "学习教育",
  "date": "2026-06-04",
  "summary": "围绕支部重点工作开展专题学习和交流研讨。",
  "content": "支部党员结合岗位实践进行了深入交流，进一步统一思想认识，明确后续工作方向。",
  "image": "assets/uploads/news-01.jpg"
}
```

新闻字段说明：

- `id`：新闻唯一标识，建议包含日期
- `title`：新闻标题
- `category`：新闻分类
- `date`：发布日期，格式为 `YYYY-MM-DD`
- `summary`：新闻摘要
- `content`：新闻正文
- `image`：图片路径

## 本地预览

可以直接在浏览器中打开 `index.html` 和 `admin.html` 进行查看。

如果浏览器对本地 `fetch` 有限制，建议使用任意静态文件服务方式预览，例如编辑器自带预览服务。

## GitHub Pages 部署

### 1. 推送仓库到 GitHub

将当前项目提交并推送到 GitHub 仓库。

### 2. 开启 Pages

在 GitHub 仓库设置中打开：

```text
Settings -> Pages
```

选择部署分支：

```text
main / root
```

### 3. 访问站点

部署完成后，GitHub Pages 会生成站点地址，例如：

```text
https://你的用户名.github.io/
```

如果仓库名称不是用户主页仓库，也可能是：

```text
https://你的用户名.github.io/仓库名/
```

## 注意事项

- 当前项目是静态站点，不包含后端数据库
- `admin.html` 用于辅助生成新闻数据，不会自动把内容写回仓库
- 新增新闻后，仍需手动更新 `data/news.json` 并提交到 GitHub
- 若需要真正的在线上传和自动保存能力，需要额外接入 CMS、GitHub API 或独立后端服务
