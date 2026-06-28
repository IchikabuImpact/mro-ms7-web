'use strict';

const mysql = require('mysql2/promise');
const { categories, autoMenus, recipes } = require('./data');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '331155',
    database: 'microwave_cookbook',
    multipleStatements: true,
  });

  try {
    console.log('DB接続成功');

    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    await conn.execute('TRUNCATE TABLE steps');
    await conn.execute('TRUNCATE TABLE ingredients');
    await conn.execute('TRUNCATE TABLE recipes');
    await conn.execute('TRUNCATE TABLE auto_menus');
    await conn.execute('TRUNCATE TABLE categories');
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('既存データをクリア');

    for (const c of categories) {
      await conn.execute(
        'INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)',
        [c.id, c.name, c.icon, c.sort_order]
      );
    }
    console.log(`カテゴリー ${categories.length}件 インポート`);

    for (const m of autoMenus) {
      await conn.execute(
        'INSERT INTO auto_menus (id, menu_number, name, heat_type, tank_setting, tray_position, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [m.id, m.menu_number, m.name, m.heat_type, m.tank_setting, m.tray_position, m.description]
      );
    }
    console.log(`オートメニュー ${autoMenus.length}件 インポート`);

    for (const r of recipes) {
      await conn.execute(
        `INSERT INTO recipes (id, title, subtitle, category_id, auto_menu_id, servings, heating_time, heating_method, temperature, tips, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.title, r.subtitle, r.category_id, r.auto_menu_id, r.servings,
         r.heating_time, r.heating_method, r.temperature, r.tips, r.notes, r.id]
      );

      let order = 1;
      for (const ing of r.ingredients) {
        await conn.execute(
          'INSERT INTO ingredients (recipe_id, group_label, name, amount, sort_order) VALUES (?, ?, ?, ?, ?)',
          [r.id, ing.group_label, ing.name, ing.amount, order++]
        );
      }

      for (let i = 0; i < r.steps.length; i++) {
        await conn.execute(
          'INSERT INTO steps (recipe_id, step_number, description) VALUES (?, ?, ?)',
          [r.id, i + 1, r.steps[i]]
        );
      }
    }
    console.log(`レシピ ${recipes.length}件（材料・手順含む）インポート`);
    console.log('\n✅ インポート完了！');

  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error('エラー:', err.message); process.exit(1); });
