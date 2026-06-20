const MAX_POINTS = 60;
const FAVORITES_KEY = "stock-favorites";
let lastQueriedStock = null;

const elements = {
  form: document.getElementById("stock-form"),
  symbol: document.getElementById("symbol"),
  status: document.getElementById("summary-status"),
  message: document.getElementById("summary-message"),
  close: document.getElementById("summary-close"),
  date: document.getElementById("summary-date"),
  change: document.getElementById("summary-change"),
  range: document.getElementById("summary-range"),
  volume: document.getElementById("summary-volume"),
  open: document.getElementById("summary-open"),
  tableBody: document.getElementById("data-table-body"),
  quickList: document.getElementById("quick-list"),
  favoriteAdd: document.getElementById("favorite-add"),
  favoriteList: document.getElementById("favorite-list"),
  candlestickCanvas: document.getElementById("candlestick-chart"),
  volumeCanvas: document.getElementById("volume-chart"),
  analysisScore: document.getElementById("analysis-score"),
  analysisSignal: document.getElementById("analysis-signal"),
  analysisMa: document.getElementById("analysis-ma"),
  analysisMaDetail: document.getElementById("analysis-ma-detail"),
  analysisVolume: document.getElementById("analysis-volume"),
  analysisVolumeDetail: document.getElementById("analysis-volume-detail"),
  analysisRisk: document.getElementById("analysis-risk"),
  analysisRiskDetail: document.getElementById("analysis-risk-detail"),
  metricMa5: document.getElementById("metric-ma5"),
  metricMa20: document.getElementById("metric-ma20"),
  metricMa60: document.getElementById("metric-ma60"),
  metricVolatility: document.getElementById("metric-volatility"),
  metricVolumeRatio: document.getElementById("metric-volume-ratio"),
  metricPosition: document.getElementById("metric-position"),
  analysisList: document.getElementById("analysis-list")
};

if (elements.form) {
  elements.form.addEventListener("submit", handleSubmit);
}

if (elements.quickList) {
  elements.quickList.addEventListener("click", handleQuickQuery);
}

if (elements.favoriteAdd) {
  elements.favoriteAdd.addEventListener("click", handleAddFavorite);
}

if (elements.favoriteList) {
  elements.favoriteList.addEventListener("click", handleFavoriteClick);
}

function querySymbol(symbol) {
  elements.symbol.value = symbol;
  elements.form.requestSubmit();
}

function handleQuickQuery(event) {
  const button = event.target.closest("[data-symbol]");
  if (!button) {
    return;
  }

  querySymbol(button.dataset.symbol);
}

function handleAddFavorite() {
  try {
    const symbol = normalizeAshareSymbol(elements.symbol.value);
    const stock = lastQueriedStock?.symbol === symbol ? lastQueriedStock : { symbol, name: "" };
    const favorites = getFavorites();
    const existing = favorites.find((favorite) => favorite.symbol === symbol);

    if (existing) {
      existing.name = existing.name || stock.name;
    } else {
      favorites.push(stock);
    }

    saveFavorites(favorites);
    renderFavorites();
    updateStatus("已收藏", `${formatStockLabel(stock)} 已加入我的收藏。`);
  } catch (error) {
    updateStatus("收藏失败", error.message);
  }
}

function handleFavoriteClick(event) {
  const removeButton = event.target.closest("[data-remove-symbol]");
  if (removeButton) {
    removeFavorite(removeButton.dataset.removeSymbol);
    return;
  }

  const queryButton = event.target.closest("[data-symbol]");
  if (queryButton) {
    querySymbol(queryButton.dataset.symbol);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const symbol = elements.symbol.value.trim().toUpperCase();

  if (!symbol) {
    updateStatus("输入不完整", "请填写股票代码。");
    return;
  }

  updateStatus("查询中", `正在获取 ${symbol} 的日线行情...`);
  clearCharts();
  renderTable([]);

  try {
    const stock = await fetchDailySeries(symbol);
    const displayPoints = stock.points.slice(0, MAX_POINTS);

    if (displayPoints.length < 2) {
      throw new Error("返回的行情数据不足，无法绘图。");
    }

    const latest = displayPoints[0];
    const previous = displayPoints[1];
    lastQueriedStock = { symbol: stock.symbol, name: stock.name };
    updateSummary(stock, latest, previous);
    renderTable(displayPoints.slice(0, 10));
    renderAdvancedAnalysis(stock, displayPoints);
    drawCandlestickChart(displayPoints.slice().reverse());
    drawVolumeChart(displayPoints.slice().reverse());
    updateFavoriteName(stock);
    updateStatus("查询完成", `${formatStockLabel(stock)} 最近 ${displayPoints.length} 个交易日数据已加载。`);
    window.localStorage.setItem("stock-last-symbol", stock.symbol);
  } catch (error) {
    updateStatus("查询失败", error.message);
  }
}

async function fetchDailySeries(symbol) {
  const stockCode = normalizeAshareSymbol(symbol);
  const stockSymbol = toTencentSymbol(stockCode);
  const url = new URL("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get");
  url.searchParams.set("param", `${stockSymbol},day,,,${MAX_POINTS},qfq`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    symbol: stockCode,
    name: parseTencentStockName(data, stockSymbol),
    points: parseTencentKlines(data, stockSymbol)
  };
}

function normalizeAshareSymbol(symbol) {
  const stockCode = symbol.trim();
  if (!/^\d{6}$/.test(stockCode)) {
    throw new Error("请输入 6 位 A 股代码，例如 600519、000001。");
  }
  return stockCode;
}

function toTencentSymbol(stockCode) {
  const market = stockCode.startsWith("6") ? "sh" : "sz";
  return `${market}${stockCode}`;
}

function parseTencentStockName(data, stockSymbol) {
  return data?.data?.[stockSymbol]?.qt?.[stockSymbol]?.[1] || "";
}

function parseTencentKlines(data, stockSymbol) {
  const stockData = data?.data?.[stockSymbol];
  const klines = stockData?.qfqday || stockData?.day;
  if (!klines?.length) {
    throw new Error("未获取到日线数据，请检查 A 股代码是否正确。");
  }

  return klines.map(([date, open, close, high, low, volume]) => ({
    date,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume)
  }))
    .filter((point) => point.date && Number.isFinite(point.close))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function updateSummary(stock, latest, previous) {
  const diff = latest.close - previous.close;
  const percent = (diff / previous.close) * 100;
  const isUp = diff >= 0;

  elements.close.textContent = formatPrice(latest.close);
  elements.date.textContent = `${formatStockLabel(stock)} | ${latest.date}`;
  elements.change.textContent = `${isUp ? "+" : ""}${formatPrice(diff)} (${percent.toFixed(2)}%)`;
  elements.change.className = isUp ? "price-up" : "price-down";
  elements.range.textContent = `最高 ${formatPrice(latest.high)} / 最低 ${formatPrice(latest.low)}`;
  elements.volume.textContent = formatVolume(latest.volume);
  elements.open.textContent = `开盘 ${formatPrice(latest.open)}`;
}

function renderAdvancedAnalysis(stock, points) {
  const closes = points.map((point) => point.close);
  const volumes = points.map((point) => point.volume);
  const latest = points[0];
  const ma5 = average(closes.slice(0, 5));
  const ma20 = average(closes.slice(0, 20));
  const ma60 = average(closes);
  const volumeAverage20 = average(volumes.slice(0, 20));
  const volumeRatio = latest.volume / Math.max(volumeAverage20, 1);
  const volatility = calculateVolatility(closes.slice(0, 20));
  const highest = Math.max(...points.map((point) => point.high));
  const lowest = Math.min(...points.map((point) => point.low));
  const position = ((latest.close - lowest) / Math.max(highest - lowest, 0.01)) * 100;
  const trendScore = calculateTrendScore(latest.close, ma5, ma20, ma60, volumeRatio, volatility, position);
  const signal = getSignal(trendScore);
  const maTrend = latest.close >= ma5 && ma5 >= ma20 ? "多头排列" : latest.close < ma5 && ma5 < ma20 ? "短线偏弱" : "震荡整理";
  const volumeState = volumeRatio >= 1.5 ? "明显放量" : volumeRatio <= 0.7 ? "量能收缩" : "量能平稳";
  const riskState = volatility >= 4 ? "高波动" : volatility >= 2 ? "中等波动" : "低波动";
  const insights = [
    `${formatStockLabel(stock)} 当前收盘价位于 60 日区间的 ${position.toFixed(1)}%，${position >= 70 ? "处于相对高位" : position <= 30 ? "处于相对低位" : "处于中部区域"}。`,
    `短中期均线状态为${maTrend}，MA5 ${formatPrice(ma5)}，MA20 ${formatPrice(ma20)}。`,
    `今日量比 ${volumeRatio.toFixed(2)}，${volumeState}，可结合价格方向观察资金活跃度。`,
    `近 20 日年化波动率约 ${volatility.toFixed(2)}%，风险状态为${riskState}。`
  ];

  setText(elements.analysisScore, `${trendScore} / 100`);
  setText(elements.analysisSignal, signal.text);
  elements.analysisScore.className = signal.className;
  setText(elements.analysisMa, maTrend);
  setText(elements.analysisMaDetail, `MA5 ${formatPrice(ma5)} / MA20 ${formatPrice(ma20)} / MA60 ${formatPrice(ma60)}`);
  setText(elements.analysisVolume, volumeState);
  setText(elements.analysisVolumeDetail, `今日量比 ${volumeRatio.toFixed(2)}，20 日均量 ${formatVolume(volumeAverage20)}`);
  setText(elements.analysisRisk, riskState);
  setText(elements.analysisRiskDetail, `波动率 ${volatility.toFixed(2)}%，区间位置 ${position.toFixed(1)}%`);
  setText(elements.metricMa5, formatPrice(ma5));
  setText(elements.metricMa20, formatPrice(ma20));
  setText(elements.metricMa60, formatPrice(ma60));
  setText(elements.metricVolatility, `${volatility.toFixed(2)}%`);
  setText(elements.metricVolumeRatio, volumeRatio.toFixed(2));
  setText(elements.metricPosition, `${position.toFixed(1)}%`);

  if (elements.analysisList) {
    elements.analysisList.innerHTML = insights.map((insight) => `<p>${escapeHtml(insight)}</p>`).join("");
  }
}

function calculateTrendScore(close, ma5, ma20, ma60, volumeRatio, volatility, position) {
  let score = 50;
  score += close >= ma5 ? 10 : -8;
  score += ma5 >= ma20 ? 12 : -10;
  score += ma20 >= ma60 ? 10 : -8;
  score += volumeRatio >= 1 && close >= ma5 ? 8 : volumeRatio < 0.7 ? -4 : 0;
  score += position >= 35 && position <= 80 ? 6 : position > 90 ? -6 : 0;
  score -= volatility >= 5 ? 8 : volatility >= 3 ? 3 : 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSignal(score) {
  if (score >= 72) {
    return { text: "趋势较强，关注量价延续", className: "price-up" };
  }

  if (score <= 40) {
    return { text: "走势偏弱，注意回撤风险", className: "price-down" };
  }

  return { text: "震荡观察，等待方向确认", className: "price-neutral" };
}

function calculateVolatility(closes) {
  const returns = [];
  for (let i = 0; i < closes.length - 1; i += 1) {
    returns.push((closes[i] - closes[i + 1]) / closes[i + 1]);
  }

  const mean = average(returns);
  const variance = average(returns.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function average(values) {
  const validValues = values.filter(Number.isFinite);
  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function formatStockLabel(stock) {
  return stock.name ? `${stock.name} ${stock.symbol}` : stock.symbol;
}

function updateStatus(title, message) {
  elements.status.textContent = title;
  elements.message.textContent = message;
}

function getFavorites() {
  try {
    const value = window.localStorage.getItem(FAVORITES_KEY);
    const favorites = JSON.parse(value || "[]");
    if (!Array.isArray(favorites)) {
      return [];
    }

    return favorites.map((favorite) => {
      if (typeof favorite === "string") {
        return { symbol: favorite, name: "" };
      }

      return {
        symbol: favorite?.symbol,
        name: favorite?.name || ""
      };
    }).filter((favorite) => /^\d{6}$/.test(favorite.symbol));
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function removeFavorite(symbol) {
  saveFavorites(getFavorites().filter((favorite) => favorite.symbol !== symbol));
  renderFavorites();
}

function updateFavoriteName(stock) {
  if (!stock.name) {
    return;
  }

  const favorites = getFavorites();
  const favorite = favorites.find((item) => item.symbol === stock.symbol);
  if (!favorite || favorite.name === stock.name) {
    return;
  }

  favorite.name = stock.name;
  saveFavorites(favorites);
  renderFavorites();
}

function renderFavorites() {
  const favorites = getFavorites();

  if (!elements.favoriteList) {
    return;
  }

  if (!favorites.length) {
    elements.favoriteList.innerHTML = '<span class="empty-favorite">暂无收藏</span>';
    return;
  }

  elements.favoriteList.innerHTML = favorites.map((stock) => `
    <span class="favorite-chip">
      <button class="chip-button" type="button" data-symbol="${stock.symbol}">${escapeHtml(formatStockLabel(stock))}</button>
      <button class="favorite-chip__remove" type="button" data-remove-symbol="${stock.symbol}" aria-label="删除 ${stock.symbol}">×</button>
    </span>
  `).join("");
}

function renderTable(points) {
  if (!points.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">暂无数据</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = points.map((point) => `
    <tr>
      <td>${point.date}</td>
      <td>${formatPrice(point.open)}</td>
      <td>${formatPrice(point.high)}</td>
      <td>${formatPrice(point.low)}</td>
      <td>${formatPrice(point.close)}</td>
      <td>${formatVolume(point.volume)}</td>
    </tr>
  `).join("");
}

function drawCandlestickChart(points) {
  const canvas = elements.candlestickCanvas;
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 20, bottom: 28, left: 56 };
  const highs = points.map((point) => point.high);
  const lows = points.map((point) => point.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const priceRange = Math.max(maxPrice - minPrice, 0.01);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const candleSlot = plotWidth / points.length;
  const candleWidth = Math.max(4, candleSlot * 0.58);

  drawChartFrame(ctx, width, height, padding);

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const x = padding.left + i * candleSlot + candleSlot / 2;
    const openY = mapValue(point.open, minPrice, priceRange, padding.top, plotHeight);
    const closeY = mapValue(point.close, minPrice, priceRange, padding.top, plotHeight);
    const highY = mapValue(point.high, minPrice, priceRange, padding.top, plotHeight);
    const lowY = mapValue(point.low, minPrice, priceRange, padding.top, plotHeight);
    const color = point.close >= point.open ? "#ff4d5e" : "#21c784";

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
    ctx.fillStyle = color;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  }

  drawPriceAxis(ctx, minPrice, maxPrice, padding, plotHeight, width);
}

function drawVolumeChart(points) {
  const canvas = elements.volumeCanvas;
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 20, bottom: 28, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxVolume = Math.max(...points.map((point) => point.volume), 1);
  const barSlot = plotWidth / points.length;
  const barWidth = Math.max(4, barSlot * 0.62);

  drawChartFrame(ctx, width, height, padding);

  points.forEach((point, index) => {
    const x = padding.left + index * barSlot + (barSlot - barWidth) / 2;
    const heightRatio = point.volume / maxVolume;
    const barHeight = plotHeight * heightRatio;
    const y = padding.top + plotHeight - barHeight;
    ctx.fillStyle = point.close >= point.open ? "rgba(255, 77, 94, 0.85)" : "rgba(33, 199, 132, 0.85)";
    ctx.fillRect(x, y, barWidth, barHeight);
  });

  drawVolumeAxis(ctx, maxVolume, padding, plotHeight, width);
}

function drawChartFrame(ctx, width, height, padding) {
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(31, 42, 46, 0.1)";
  ctx.lineWidth = 1;

  const lines = 4;
  for (let i = 0; i <= lines; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / lines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
}

function drawPriceAxis(ctx, minPrice, maxPrice, padding, plotHeight, width) {
  ctx.fillStyle = "#6f7b7c";
  ctx.font = '12px "Microsoft YaHei"';
  ctx.textAlign = "right";

  const lines = 4;
  for (let i = 0; i <= lines; i += 1) {
    const ratio = i / lines;
    const price = maxPrice - (maxPrice - minPrice) * ratio;
    const y = padding.top + plotHeight * ratio + 4;
    ctx.fillText(formatPrice(price), padding.left - 10, y);
  }

  ctx.textAlign = "left";
  ctx.fillText("最近", padding.left, padding.top + plotHeight + 20);
  ctx.fillText("当前", width - padding.right - 28, padding.top + plotHeight + 20);
}

function drawVolumeAxis(ctx, maxVolume, padding, plotHeight, width) {
  ctx.fillStyle = "#6f7b7c";
  ctx.font = '12px "Microsoft YaHei"';
  ctx.textAlign = "right";

  const lines = 4;
  for (let i = 0; i <= lines; i += 1) {
    const ratio = i / lines;
    const volume = Math.round(maxVolume * (1 - ratio));
    const y = padding.top + plotHeight * ratio + 4;
    ctx.fillText(formatVolume(volume), padding.left - 10, y);
  }

  ctx.textAlign = "left";
  ctx.fillText("最近", padding.left, padding.top + plotHeight + 20);
  ctx.fillText("当前", width - padding.right - 28, padding.top + plotHeight + 20);
}

function mapValue(value, minPrice, priceRange, top, plotHeight) {
  return top + ((minPrice + priceRange - value) / priceRange) * plotHeight;
}

function clearCharts() {
  [elements.candlestickCanvas, elements.volumeCanvas].forEach((canvas) => {
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function formatPrice(value) {
  return Number(value).toFixed(2);
}

function formatVolume(value) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(value));
}

function restoreLastQuery() {
  const savedSymbol = window.localStorage.getItem("stock-last-symbol");

  if (savedSymbol) {
    elements.symbol.value = savedSymbol;
  }
}

restoreLastQuery();
renderFavorites();
