'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '../public');

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(str) {
  return esc(str).replace(/\n/g, '<br>');
}

function htmlHead(title, extra = '') {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/assets/style.css">
${extra}
</head>
<body>`;
}

function header(linkToTop = false) {
  const logo = linkToTop
    ? `<a href="/" class="header-logo">🍽️ 料理集ダッシュボード<span>MRO-MS7</span></a>`
    : `<span class="header-logo">🍽️ 料理集ダッシュボード<span>MRO-MS7</span></span>`;
  return `<header><div class="header-inner">
${logo}
<span class="header-sub">日立 過熱水蒸気オーブンレンジ</span>
</div></header>`;
}

function footer() {
  return `<footer>日立過熱水蒸気オーブンレンジ MRO-MS7 クッキングガイド (2013年版) をもとに生成</footer>`;
}

async function generateIndex(conn) {
  const [cats] = await conn.execute('SELECT * FROM categories ORDER BY sort_order');
  const [recipes] = await conn.execute(`
    SELECT r.*, c.name AS cat_name, c.icon AS cat_icon,
           am.menu_number, am.name AS menu_name
    FROM recipes r
    JOIN categories c ON r.category_id = c.id
    LEFT JOIN auto_menus am ON r.auto_menu_id = am.id
    ORDER BY r.category_id, r.sort_order
  `);

  const catOptions = cats.map(c =>
    `<option value="${esc(c.name)}">${esc(c.icon)} ${esc(c.name)}</option>`
  ).join('\n');

  const catBtns = cats.map(c =>
    `<button class="cat-btn" data-cat="${esc(c.name)}">${esc(c.icon)} ${esc(c.name)}</button>`
  ).join('\n');

  const cards = recipes.map(r => {
    const menuTag = r.menu_name
      ? `<span class="tag menu">No.${r.menu_number} ${esc(r.menu_name)}</span>` : '';
    const timeTag = r.heating_time
      ? `<span class="tag time">⏱ ${esc(r.heating_time.split('\n')[0].substring(0, 20))}</span>` : '';
    return `<a href="/recipe-${r.id}.html" class="recipe-card"
  data-cat="${esc(r.cat_name)}"
  data-title="${esc(r.title)}"
  data-method="${esc(r.heating_method)}">
  <div class="card-thumb">${esc(r.cat_icon)}</div>
  <div class="card-body">
    <div class="card-cat">${esc(r.cat_name)}</div>
    <div class="card-title">${esc(r.title)}</div>
    ${r.subtitle ? `<div class="card-subtitle">${esc(r.subtitle)}</div>` : ''}
    <div class="card-meta">${menuTag}${timeTag}</div>
  </div>
</a>`;
  }).join('\n');

  const html = `${htmlHead('料理集ダッシュボード | MRO-MS7', `<style>
.hero{background:linear-gradient(135deg,#c0392b 0%,#96281b 100%);color:#fff;padding:32px 24px;text-align:center;margin-bottom:0}
.hero h1{font-size:28px;font-weight:700;margin-bottom:8px}
.hero p{font-size:14px;opacity:.85}
</style>`)}
${header()}
<div class="hero">
  <h1>🍽️ 料理集ダッシュボード</h1>
  <p>日立 過熱水蒸気オーブンレンジ MRO-MS7 — ${recipes.length}種類のレシピ</p>
</div>
<main>
  <div class="search-bar">
    <input type="text" id="searchInput" placeholder="料理名・食材で検索…">
    <select id="catSelect">
      <option value="">すべてのカテゴリー</option>
      ${catOptions}
    </select>
  </div>
  <div class="cat-nav">
    <button class="cat-btn active" data-cat="">すべて</button>
    ${catBtns}
  </div>
  <p class="result-count" id="resultCount">${recipes.length}件のレシピ</p>
  <div class="recipe-grid" id="recipeGrid">
${cards}
  </div>
  <div class="no-results" id="noResults" style="display:none">
    <div class="icon">🔍</div>
    <p>該当するレシピが見つかりませんでした</p>
  </div>
</main>
${footer()}
<script>
(function(){
  const grid = document.getElementById('recipeGrid');
  const cards = Array.from(grid.querySelectorAll('.recipe-card'));
  const input = document.getElementById('searchInput');
  const catSelect = document.getElementById('catSelect');
  const catBtns = document.querySelectorAll('.cat-btn');
  const count = document.getElementById('resultCount');
  const noRes = document.getElementById('noResults');
  let activeCat = '';

  function filter() {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const catMatch = !activeCat || card.dataset.cat === activeCat;
      const textMatch = !q ||
        card.dataset.title.toLowerCase().includes(q) ||
        card.dataset.method.toLowerCase().includes(q);
      const show = catMatch && textMatch;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    count.textContent = visible + '件のレシピ';
    noRes.style.display = visible === 0 ? '' : 'none';
    grid.style.display = visible === 0 ? 'none' : '';
  }

  input.addEventListener('input', filter);
  catSelect.addEventListener('change', function() {
    activeCat = this.value;
    catBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === activeCat));
    filter();
  });
  catBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      activeCat = this.dataset.cat;
      catSelect.value = activeCat;
      catBtns.forEach(b => b.classList.toggle('active', b === this));
      filter();
    });
  });
})();
</script>
</body></html>`;

  fs.writeFileSync(path.join(PUBLIC, 'index.html'), html, 'utf8');
  console.log('index.html 生成');
}

async function generateRecipe(conn, recipe) {
  const [ings] = await conn.execute(
    'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order',
    [recipe.id]
  );
  const [steps] = await conn.execute(
    'SELECT * FROM steps WHERE recipe_id = ? ORDER BY step_number',
    [recipe.id]
  );
  let menu = null;
  if (recipe.auto_menu_id) {
    const [[m]] = await conn.execute('SELECT * FROM auto_menus WHERE id = ?', [recipe.auto_menu_id]);
    menu = m;
  }
  const [[cat]] = await conn.execute('SELECT * FROM categories WHERE id = ?', [recipe.category_id]);

  // Build ingredients HTML
  let ingHtml = '';
  let lastGroup = null;
  for (const ing of ings) {
    if (ing.group_label && ing.group_label !== lastGroup) {
      ingHtml += `<div class="ingredient-group-label">${esc(ing.group_label)}</div>`;
      lastGroup = ing.group_label;
    } else if (!ing.group_label && lastGroup) {
      lastGroup = null;
    }
    ingHtml += `<div class="ingredient-row">
  <span class="name">${esc(ing.name)}</span>
  <span class="amount">${esc(ing.amount)}</span>
</div>`;
  }

  const stepsHtml = steps.map(s => `<div class="step-item">
  <div class="step-num">${s.step_number}</div>
  <div class="step-text">${nl2br(s.description)}</div>
</div>`).join('\n');

  const menuBadge = menu ? `<div class="auto-menu-badge">
  <div class="badge-num">${menu.menu_number}</div>
  <div class="badge-info">
    <div class="badge-name">${esc(menu.name)}</div>
    <div class="badge-desc">${esc(menu.description)}</div>
    <div class="badge-setting">
      <span>給水タンク: ${esc(menu.tank_setting)}</span>
      <span>黒皿: ${esc(menu.tray_position)}</span>
    </div>
  </div>
</div>` : '';

  const metaBoxes = [
    recipe.servings   ? `<div class="meta-box"><div class="label">分量</div><div class="value">${esc(recipe.servings)}</div></div>` : '',
    recipe.heating_time ? `<div class="meta-box"><div class="label">加熱時間</div><div class="value">${esc(recipe.heating_time)}</div></div>` : '',
    recipe.heating_method ? `<div class="meta-box"><div class="label">調理方法</div><div class="value">${esc(recipe.heating_method)}</div></div>` : '',
    recipe.temperature ? `<div class="meta-box"><div class="label">温度設定</div><div class="value">${esc(recipe.temperature)}</div></div>` : '',
  ].filter(Boolean).join('\n');

  const tipsHtml = recipe.tips ? `<div class="tips-box">
  <div class="tips-title">💡 コツ・ポイント</div>
  ${nl2br(recipe.tips)}
</div>` : '';

  const notesHtml = recipe.notes ? `<div class="notes-box">
  <div class="notes-title">📝 準備・メモ</div>
  ${nl2br(recipe.notes)}
</div>` : '';

  const html = `${htmlHead(`${recipe.title} | 料理集ダッシュボード MRO-MS7`)}
${header(true)}
<main>
  <a href="/" class="back-link">← レシピ一覧に戻る</a>

  <div class="detail-header">
    <div class="detail-category">${esc(cat.icon)} ${esc(cat.name)}</div>
    <h1 class="detail-title">${esc(recipe.title)}</h1>
    ${recipe.subtitle ? `<div class="detail-subtitle">${esc(recipe.subtitle)}</div>` : ''}
    <div class="detail-meta-grid">${metaBoxes}</div>
  </div>

  ${menuBadge}

  <div class="detail-columns">
    <div class="section-card">
      <div class="section-title">🛒 材料</div>
      ${ingHtml}
      ${tipsHtml}
      ${notesHtml}
    </div>
    <div class="section-card">
      <div class="section-title">👨‍🍳 作りかた</div>
      ${stepsHtml}
    </div>
  </div>
</main>
${footer()}
</body></html>`;

  fs.writeFileSync(path.join(PUBLIC, `recipe-${recipe.id}.html`), html, 'utf8');
}

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '331155',
    database: 'microwave_cookbook',
  });

  try {
    await generateIndex(conn);

    const [recipes] = await conn.execute('SELECT * FROM recipes ORDER BY id');
    for (const r of recipes) {
      await generateRecipe(conn, r);
    }
    console.log(`詳細ページ ${recipes.length}件 生成`);
    console.log('\n✅ HTML生成完了！');
    console.log(`公開フォルダ: ${PUBLIC}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error('エラー:', err.message); process.exit(1); });
