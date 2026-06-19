# 股票分析网站

这是一个可部署到 GitHub Pages 的纯前端股票分析网站，支持输入股票代码查询公开行情数据，并展示：

- 最新收盘价
- 日内高低点
- 涨跌幅
- 成交量
- 最近 60 个交易日 K 线图
- 最近 60 个交易日成交量图
- 最近 10 个交易日数据表格

## 项目结构

```text
.
├── index.html              首页
├── styles.css              页面样式
├── script.js               股票查询、数据处理和图表绘制逻辑
└── assets/
    └── uploads/            预留目录
```

## 技术方案

- 前端：原生 HTML、CSS、JavaScript
- 图表：Canvas 原生绘制
- 数据源：Yahoo Finance 公开 Chart 接口
- 部署方式：GitHub Pages

当前版本不依赖后端服务，适合直接托管到静态站点平台。

## 使用方式

### 1. 查询股票

打开首页后，输入股票代码，例如：

- `AAPL`
- `MSFT`
- `NVDA`

然后点击“查询行情”。

股票代码会直接用于查询 Yahoo Finance，例如 `AAPL`、`MSFT`。

### 2. 查看结果

页面会展示：

- 查询状态
- 最新收盘价
- 涨跌幅
- 最高价和最低价
- 成交量
- K 线图
- 成交量柱状图
- 最近 10 个交易日表格

## 数据来源说明

当前实现使用的是 Yahoo Finance 的公开 Chart 接口：

```text
https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=3mo&interval=1d
```

其中：

- `range=3mo` 表示查询最近 3 个月数据
- `interval=1d` 表示日线数据

## 本地开发

可以直接打开 `index.html` 查看页面结构，但建议通过静态文件服务进行预览，以避免部分浏览器环境下的限制。

如果你使用 VS Code，可以用任意本地静态服务器插件预览。

## GitHub Pages 部署

### 1. 提交并推送仓库

将项目推送到 GitHub 仓库。

### 2. 开启 Pages

在仓库设置中选择：

```text
Settings -> Pages -> Deploy from branch
```

部署分支建议选择：

```text
main / root
```

### 3. 访问地址

部署成功后，可以通过以下形式访问：

```text
https://你的用户名.github.io/
```

或者：

```text
https://你的用户名.github.io/仓库名/
```

## 限制说明

- 这是纯前端实现，数据直接在浏览器端请求公开接口
- Yahoo Finance 公开接口可能存在访问频率、CORS 或地区限制
- 部分市场或代码可能不在该接口支持范围内
- 如果后续需要更稳定的数据源、更多指标或更高请求频率，建议增加后端中转层
