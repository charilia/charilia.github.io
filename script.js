async function loadNews() {
  const newsList = document.getElementById("news-list");
  const featuredNews = document.getElementById("featured-news");
  const galleryGrid = document.getElementById("gallery-grid");

  if (!newsList && !featuredNews && !galleryGrid) {
    return;
  }

  try {
    const response = await fetch("data/news.json");
    if (!response.ok) {
      throw new Error("新闻数据加载失败");
    }

    const newsItems = await response.json();
    if (!Array.isArray(newsItems) || newsItems.length === 0) {
      renderEmptyState(newsList, featuredNews, galleryGrid);
      return;
    }

    renderNews(newsItems, featuredNews, newsList, galleryGrid);
  } catch (error) {
    renderErrorState(newsList, featuredNews, galleryGrid, error);
  }
}

function renderNews(newsItems, featuredNews, newsList, galleryGrid) {
  const [firstItem, ...otherItems] = newsItems;

  if (featuredNews) {
    featuredNews.innerHTML = `
      <img src="${escapeHtml(firstItem.image)}" alt="${escapeHtml(firstItem.title)}">
      <div class="featured-news__body">
        <div class="news-meta">
          <span class="news-badge">${escapeHtml(firstItem.category)}</span>
          <span>${escapeHtml(firstItem.date)}</span>
        </div>
        <h3 class="featured-news__title">${escapeHtml(firstItem.title)}</h3>
        <p class="featured-news__summary">${escapeHtml(firstItem.summary)}</p>
        <p class="featured-news__content">${escapeHtml(firstItem.content)}</p>
      </div>
    `;
  }

  if (newsList) {
    newsList.innerHTML = otherItems.map((item) => `
      <article class="card news-card">
        <div class="news-meta">
          <span class="news-badge">${escapeHtml(item.category)}</span>
          <span>${escapeHtml(item.date)}</span>
        </div>
        <h3 class="news-card__title">${escapeHtml(item.title)}</h3>
        <p class="news-card__summary">${escapeHtml(item.summary)}</p>
      </article>
    `).join("");
  }

  if (galleryGrid) {
    const galleryItems = newsItems.slice(0, 6);
    galleryGrid.innerHTML = galleryItems.map((item) => `
      <article class="card gallery-item">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
        <div class="gallery-item__body">
          <div class="gallery-item__meta">
            <span class="news-badge">${escapeHtml(item.category)}</span>
            <span>${escapeHtml(item.date)}</span>
          </div>
          <h3 class="gallery-item__title">${escapeHtml(item.title)}</h3>
          <p class="news-card__summary">${escapeHtml(item.summary)}</p>
        </div>
      </article>
    `).join("");
  }
}

function renderEmptyState(newsList, featuredNews, galleryGrid) {
  const emptyHtml = "<p class=\"loading-text\">暂无新闻内容，请先在 data/news.json 中添加数据。</p>";
  if (newsList) {
    newsList.innerHTML = emptyHtml;
  }
  if (featuredNews) {
    featuredNews.innerHTML = emptyHtml;
  }
  if (galleryGrid) {
    galleryGrid.innerHTML = emptyHtml;
  }
}

function renderErrorState(newsList, featuredNews, galleryGrid, error) {
  const errorHtml = `<p class="loading-text">${escapeHtml(error.message)}</p>`;
  if (newsList) {
    newsList.innerHTML = errorHtml;
  }
  if (featuredNews) {
    featuredNews.innerHTML = errorHtml;
  }
  if (galleryGrid) {
    galleryGrid.innerHTML = errorHtml;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function setupAdminForm() {
  const form = document.getElementById("news-form");
  const preview = document.getElementById("entry-preview");
  const jsonOutput = document.getElementById("json-output");
  const copyButton = document.getElementById("copy-json");

  if (!form || !preview || !jsonOutput || !copyButton) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const date = String(formData.get("date") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const content = String(formData.get("content") || "").trim();
    const image = String(formData.get("image") || "").trim();

    const entry = {
      id: createEntryId(title, date),
      title,
      category,
      date,
      summary,
      content,
      image
    };

    preview.innerHTML = `
      <article>
        <div class="news-meta">
          <span class="news-badge">${escapeHtml(entry.category)}</span>
          <span>${escapeHtml(entry.date)}</span>
        </div>
        <h3 class="news-card__title">${escapeHtml(entry.title)}</h3>
        <p class="news-card__summary">${escapeHtml(entry.summary)}</p>
        <p class="featured-news__content">${escapeHtml(entry.content)}</p>
        <p class="featured-news__content">图片路径：<code>${escapeHtml(entry.image)}</code></p>
      </article>
    `;

    jsonOutput.textContent = JSON.stringify(entry, null, 2);
  });

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput.textContent);
      copyButton.textContent = "已复制";
      window.setTimeout(() => {
        copyButton.textContent = "复制 JSON";
      }, 1600);
    } catch (error) {
      copyButton.textContent = "复制失败";
      window.setTimeout(() => {
        copyButton.textContent = "复制 JSON";
      }, 1600);
    }
  });
}

function createEntryId(title, date) {
  const normalizedTitle = title
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9-\u4e00-\u9fa5]/g, "")
    .slice(0, 24);

  return `${date || "news"}-${normalizedTitle || "item"}`;
}

loadNews();
setupAdminForm();
