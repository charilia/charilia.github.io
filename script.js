const MAX_POINTS = 60;

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
  candlestickCanvas: document.getElementById("candlestick-chart"),
  volumeCanvas: document.getElementById("volume-chart")
};

if (elements.form) {
  elements.form.addEventListener("submit", handleSubmit);
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
    const points = await fetchDailySeries(symbol);
    const displayPoints = points.slice(0, MAX_POINTS);

    if (displayPoints.length < 2) {
      throw new Error("返回的行情数据不足，无法绘图。");
    }

    const latest = displayPoints[0];
    const previous = displayPoints[1];
    updateSummary(symbol, latest, previous);
    renderTable(displayPoints.slice(0, 10));
    drawCandlestickChart(displayPoints.slice().reverse());
    drawVolumeChart(displayPoints.slice().reverse());
    updateStatus("查询完成", `${symbol} 最近 ${displayPoints.length} 个交易日数据已加载。`);
    window.localStorage.setItem("stock-last-symbol", symbol);
  } catch (error) {
    updateStatus("查询失败", error.message);
  }
}

async function fetchDailySeries(symbol) {
  const stockCode = normalizeAshareSymbol(symbol);
  const url = new URL("https://push2his.eastmoney.com/api/qt/stock/kline/get");
  url.searchParams.set("secid", toEastmoneySecid(stockCode));
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
  url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61");
  url.searchParams.set("klt", "101");
  url.searchParams.set("fqt", "1");
  url.searchParams.set("beg", "0");
  url.searchParams.set("end", "20500101");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  return parseEastmoneyKlines(data);
}

function normalizeAshareSymbol(symbol) {
  const stockCode = symbol.trim();
  if (!/^\d{6}$/.test(stockCode)) {
    throw new Error("请输入 6 位 A 股代码，例如 600519、000001。");
  }
  return stockCode;
}

function toEastmoneySecid(stockCode) {
  const market = stockCode.startsWith("6") ? "1" : "0";
  return `${market}.${stockCode}`;
}

function parseEastmoneyKlines(data) {
  const klines = data?.data?.klines;
  if (!klines?.length) {
    throw new Error("未获取到日线数据，请检查 A 股代码是否正确。");
  }

  return klines.map((row) => {
    const [date, open, close, high, low, volume] = row.split(",");
    return {
      date,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume)
    };
  })
    .filter((point) => point.date && Number.isFinite(point.close))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function updateSummary(symbol, latest, previous) {
  const diff = latest.close - previous.close;
  const percent = (diff / previous.close) * 100;
  const isUp = diff >= 0;

  elements.close.textContent = formatPrice(latest.close);
  elements.date.textContent = `${symbol} | ${latest.date}`;
  elements.change.textContent = `${isUp ? "+" : ""}${formatPrice(diff)} (${percent.toFixed(2)}%)`;
  elements.change.className = isUp ? "price-up" : "price-down";
  elements.range.textContent = `最高 ${formatPrice(latest.high)} / 最低 ${formatPrice(latest.low)}`;
  elements.volume.textContent = formatVolume(latest.volume);
  elements.open.textContent = `开盘 ${formatPrice(latest.open)}`;
}

function updateStatus(title, message) {
  elements.status.textContent = title;
  elements.message.textContent = message;
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
  ctx.fillStyle = "rgba(4, 10, 18, 0.72)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(171, 194, 224, 0.14)";
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
  ctx.fillStyle = "#93a4bf";
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
  ctx.fillStyle = "#93a4bf";
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
