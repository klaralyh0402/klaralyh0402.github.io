# 林于涵｜个人主页

一个由 `Homepage.xlsx` 驱动的中英文双语个人主页，采用纯静态多页面结构，可直接通过 GitHub Pages 在线发布。页面会根据表格中的数据自动生成教育、奖项、证书和爱好卡片，并自动适配桌面端与手机端。

## 在线发布

1. 在 GitHub 新建一个仓库，例如 `personal-homepage`。
2. 将本目录中的全部文件推送到 `main` 分支。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中将 **Source** 设置为 **GitHub Actions**。
5. 推送后会自动运行 `.github/workflows/pages.yml`。
6. 部署完成后访问 `https://你的用户名.github.io/仓库名/`。

以后只需修改并提交 `Homepage.xlsx`，GitHub Actions 会自动重新生成内容并部署新版网站。

## 使用表格控制网站内容

### 基本信息

在 `基本信息` 表中修改姓名、页面标题、站点描述、首页介绍、关键词和照片路径。

- `中文` 列用于中文页面。
- `English` 列用于英文页面。
- `邮箱` 和 `GitHub` 为选填，留空时不会显示。
- 照片默认使用 `assets/images/profile.jpg`。

### 教育经历、获奖经历、能力证书和爱好

每个表的第一行是字段说明，从第二行开始每条记录占一行。

- `排序`：数字越小越靠前。
- 新增内容：在已有数据下方直接填写新行。
- 删除内容：删除整行数据即可。
- 空白行不会显示在网站上。
- 中文列和英文列均可独立修改。
- 爱好表支持图标：`music`、`swimming`、`fitness`、`book`、`camera`、`travel`、`language`。

表格中的 `使用说明` 页保留了同样的维护规则。

## 本地预览

首次预览或修改表格后，先运行内容生成脚本：

```bash
python tools/build_content.py
```

然后启动本地服务器：

```bash
python -m http.server 8000
```

访问 <http://localhost:8000>。

生成脚本使用 Python 标准库读取 `.xlsx`，不需要额外安装依赖。

## 自动更新流程

```text
Homepage.xlsx
      ↓
tools/build_content.py
      ↓
assets/js/content-data.js
      ↓
GitHub Pages
```

`content-data.js` 会在每次 GitHub Actions 构建时重新生成，因此网站布局保持稳定，只有表格数据发生变化。

## 目录结构

```text
.
├── index.html
├── education.html
├── awards.html
├── certificates.html
├── hobbies.html
├── Homepage.xlsx
├── assets/
│   ├── css/style.css
│   ├── images/profile.jpg
│   ├── js/content-data.js
│   ├── js/site.js
│   └── favicon.svg
├── tools/build_content.py
├── .github/workflows/pages.yml
└── README.md
```
