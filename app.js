// ===== TELEGRAM WEBAPP =====
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const DATA_BASE = './data';

function getTgId() {
    return tg?.initDataUnsafe?.user?.id?.toString() || null;
}

async function fetchJSON(path) {
    try {
        const r = await fetch(`${DATA_BASE}/${path}?_=${Date.now()}`);
        if (!r.ok) return null;
        return await r.json();
    } catch (e) {
        console.error('fetchJSON:', e);
        return null;
    }
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
        {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    ));
}

function showLoading(c) { c.innerHTML = '<div class="loading">Загрузка...</div>'; }
function showError(c, m) { c.innerHTML = `<div class="loading">❌ ${escapeHtml(m)}</div>`; }
function showEmpty(c, m) { c.innerHTML = `<div class="loading">📭 ${escapeHtml(m)}</div>`; }

// ===== ГЛАВНАЯ =====
async function loadMain() {
    const c = document.getElementById('content');
    showLoading(c);

    const [meData, topData, statsData] = await Promise.all([
        fetchJSON('players.json'),
        fetchJSON('top.json'),
        fetchJSON('stats.json'),
    ]);

    let html = '';

    const tgId = getTgId();
    let me = null;
    if (meData && meData.players) {
        me = meData.players.find(p => String(p.tg_id) === tgId);
    }

    if (me) {
        html += `
            <div class="card">
                <div class="card-title">Твой рейтинг</div>
                <div class="elo-value">${me.elo} ELO</div>
                <div class="stat-grid">
                    <div class="stat-box"><div class="value">${me.level}</div><div class="label">Уровень</div></div>
                    <div class="stat-box"><div class="value">${me.winrate}%</div><div class="label">Винрейт</div></div>
                    <div class="stat-box"><div class="value">${me.wins}</div><div class="label">Победы</div></div>
                    <div class="stat-box"><div class="value">${me.losses}</div><div class="label">Поражения</div></div>
                </div>
            </div>
        `;
    } else if (tgId) {
        html += `<div class="card"><div class="card-title">Профиль</div><p style="color:#8a8ab0;">Не найден в базе</p></div>`;
    }

    if (statsData) {
        html += `
            <div class="card">
                <div class="card-title">📊 Общая статистика</div>
                <div class="stat-grid">
                    <div class="stat-box"><div class="value">${statsData.total_players || 0}</div><div class="label">Игроков</div></div>
                    <div class="stat-box"><div class="value">${statsData.total_matches || 0}</div><div class="label">Матчей</div></div>
                    <div class="stat-box"><div class="value">${statsData.total_tournaments || 0}</div><div class="label">Турниров</div></div>
                    <div class="stat-box"><div class="value">${statsData.active_tournaments || 0}</div><div class="label">Активных</div></div>
                </div>
            </div>
        `;
    }

    html += `<div class="card"><div class="card-title">🏆 Топ-3</div>`;
    if (topData && topData.top && topData.top.length) {
        topData.top.slice(0, 3).forEach(p => {
            const rk = p.rank === 1 ? 'gold' : p.rank === 2 ? 'silver' : 'bronze';
            html += `
                <div class="top-row">
                    <div class="top-rank ${rk}">#${p.rank}</div>
                    <div class="top-info">
                        <div class="top-name">${escapeHtml(p.first_name || p.username || 'Игрок')}</div>
                        <div class="top-game">🎮 ${escapeHtml(p.game_id || '—')}</div>
                    </div>
                    <div class="top-elo">${p.elo}</div>
                </div>
            `;
        });
    } else {
        html += `<p style="color:#8a8ab0;">Топ пуст</p>`;
    }
    html += `</div>`;

    c.innerHTML = html;
}

// ===== ТОП =====
async function loadTop() {
    const c = document.getElementById('content');
    showLoading(c);

    const topData = await fetchJSON('top.json');
    if (!topData || !topData.top || !topData.top.length) {
        showEmpty(c, 'Топ пуст');
        return;
    }

    let html = `<div class="card"><div class="card-title">Топ-10 игроков</div>`;
    topData.top.forEach(p => {
        const rk = p.rank === 1 ? 'gold' : p.rank === 2 ? 'silver' : p.rank === 3 ? 'bronze' : '';
        html += `
            <div class="top-row">
                <div class="top-rank ${rk}">#${p.rank}</div>
                <div class="top-info">
                    <div class="top-name">${escapeHtml(p.first_name || p.username || 'Игрок')}</div>
                    <div class="top-game">🎮 ${escapeHtml(p.game_id || '—')} • Ур. ${p.level}</div>
                </div>
                <div class="top-elo">${p.elo}</div>
            </div>
        `;
    });
    html += `</div>`;
    c.innerHTML = html;
}

// ===== ПРОФИЛЬ =====
async function loadProfile() {
    const c = document.getElementById('content');
    showLoading(c);

    const tgId = getTgId();
    if (!tgId) { showError(c, 'Открой через Telegram'); return; }

    const meData = await fetchJSON('players.json');
    if (!meData || !meData.players) { showError(c, 'Данные не загружены'); return; }

    const me = meData.players.find(p => String(p.tg_id) === tgId);
    if (!me) { showError(c, 'Профиль не найден. Открой бота и зарегистрируйся.'); return; }

    let html = `
        <div class="card">
            <div class="card-title">Игрок</div>
            <div style="font-size:20px;font-weight:600;">${escapeHtml(me.first_name || me.username || 'Игрок')}</div>
            <div style="color:#8a8ab0;margin-top:4px;">🎮 ${escapeHtml(me.game_id || '—')}</div>
            <div style="color:#8a8ab0;font-size:12px;margin-top:4px;">🆔 TG: ${me.tg_id}</div>
        </div>
    `;

    if (!me.is_calibrated) {
        html += `
            <div class="calibration">
                🎯 КАЛИБРОВКА<br>
                <span style="font-size:32px;">${me.calibration_matches || 0} / 5</span><br>
                Побед: ${me.calibration_wins || 0}
            </div>
        `;
    } else {
        html += `
            <div class="card">
                <div class="card-title">Рейтинг</div>
                <div class="elo-value">${me.elo} ELO</div>
                <div style="color:#8a8ab0;margin-top:8px;">
                    Уровень ${me.level}${me.to_next > 0 ? ` • До след. уровня: ${me.to_next} ELO` : ' • МАКСИМУМ'}
                </div>
            </div>
        `;
    }

    html += `
        <div class="card">
            <div class="card-title">Статистика</div>
            <div class="stat-grid">
                <div class="stat-box"><div class="value">${me.matches || 0}</div><div class="label">Матчи</div></div>
                <div class="stat-box"><div class="value">${me.winrate || 0}%</div><div class="label">Винрейт</div></div>
                <div class="stat-box"><div class="value">${me.wins || 0}</div><div class="label">Победы</div></div>
                <div class="stat-box"><div class="value">${me.losses || 0}</div><div class="label">Поражения</div></div>
            </div>
        </div>
    `;

    if (me.history && me.history.length) {
        html += `<div class="card"><div class="card-title">История матчей</div>`;
        me.history.slice(0, 15).forEach(h => {
            const emoji = h.result === 'Победа' ? '✅' : '❌';
            const sign = h.elo_change > 0 ? '+' : '';
            const color = h.elo_change >= 0 ? '#4caf50' : '#ff5252';
            html += `
                <div class="top-row">
                    <div style="flex:1;">
                        <div class="top-name">${emoji} vs ${escapeHtml(h.opponent || '—')}</div>
                        <div class="top-game">${escapeHtml(h.tourney_name || '')} • ${h.score || ''}</div>
                    </div>
                    <div class="top-elo" style="color:${color};">${sign}${h.elo_change || 0}</div>
                </div>
            `;
        });
        html += `</div>`;
    }

    c.innerHTML = html;
}

// ===== ТУРНИРЫ =====
async function loadTournaments() {
    const c = document.getElementById('content');
    showLoading(c);

    const data = await fetchJSON('tournaments.json');
    if (!data || !data.tournaments || !data.tournaments.length) {
        showEmpty(c, 'Нет турниров');
        return;
    }

    let html = '';
    data.tournaments.forEach(t => {
        const statusLabel = {
            registration: '📝 Регистрация',
            active: '🔴 Активен',
            finished: '✅ Завершён'
        }[t.status] || t.status;

        html += `
            <div class="tourney-card" onclick="openTournament('${t.tourney_id}')">
                <div class="tourney-name">🏆 ${escapeHtml(t.name)}</div>
                <div class="tourney-meta">
                    <span class="status ${t.status}">${statusLabel}</span>
                    <span>👥 ${t.count}/${t.max_players}</span>
                    <span>🎁 ${escapeHtml(t.prize || '—')}</span>
                </div>
            </div>
        `;
    });
    c.innerHTML = html;
    window._tournaments = data.tournaments;
}

function openTournament(id) {
    const t = (window._tournaments || []).find(x => x.tourney_id === id);
    if (!t) return;

    let text = `🏆 ${t.name}\n👥 ${t.count}/${t.max_players}\n🎁 ${t.prize || '—'}\n🗺 ${t.map || '—'}\n\n`;

    if (t.matches && t.matches.length) {
        text += 'Матчи:\n';
        t.matches.slice(0, 20).forEach(m => {
            text += `#${m.match_number}: ${m.player1 || '—'} vs ${m.player2 || '—'} — ${m.score || ''}\n`;
        });
    } else {
        text += 'Матчи ещё не созданы';
    }

    if (tg) {
        tg.showAlert(text);
    } else {
        alert(text);
    }
}

// ===== ПОМОЩЬ =====
function loadHelp() {
    const c = document.getElementById('content');

    const levels = [
        { lvl: 1, name: 'Новичок', min: 100, max: 500, color: '#4caf50' },
        { lvl: 2, name: 'Новичок', min: 501, max: 750, color: '#8bc34a' },
        { lvl: 3, name: 'Средний', min: 751, max: 900, color: '#2196f3' },
        { lvl: 4, name: 'Средний', min: 901, max: 1050, color: '#03a9f4' },
        { lvl: 5, name: 'Продвинутый', min: 1051, max: 1200, color: '#ffc107' },
        { lvl: 6, name: 'Продвинутый', min: 1201, max: 1350, color: '#ffeb3b' },
        { lvl: 7, name: 'Сильный', min: 1351, max: 1530, color: '#ff9800' },
        { lvl: 8, name: 'Сильный', min: 1531, max: 1750, color: '#ff5722' },
        { lvl: 9, name: 'Профи', min: 1751, max: 2000, color: '#f44336' },
        { lvl: 10, name: 'Профи', min: 2001, max: '∞', color: '#d32f2f' },
    ];

    let html = `
        <div class="card">
            <div class="card-title">📊 Уровни FACEIT</div>
            <p style="color:#8a8ab0;font-size:13px;margin-bottom:12px;">
                Уровень рассчитывается автоматически по ELO
            </p>
            <table>
                <thead>
                    <tr style="color:#8a8ab0;font-size:11px;text-transform:uppercase;">
                        <th style="text-align:left;">Ур.</th>
                        <th style="text-align:left;">ELO</th>
                        <th style="text-align:left;">Группа</th>
                    </tr>
                </thead>
                <tbody>
    `;

    levels.forEach(l => {
        html += `
            <tr style="border-top:1px solid #252540;">
                <td>
                    <span style="background:${l.color};color:#fff;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;">
                        ${l.lvl}
                    </span>
                </td>
                <td style="color:#fff;">${l.min}–${l.max}</td>
                <td style="color:#8a8ab0;">${l.name}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;

    const eloTable = [
        { score: '8-0', w: 50, l: -50 },
        { score: '8-1', w: 50, l: -50 },
        { score: '8-2', w: 50, l: -50 },
        { score: '8-3', w: 25, l: -25 },
        { score: '8-4', w: 25, l: -25 },
        { score: '8-5', w: 25, l: -25 },
        { score: '8-6', w: 10, l: -10 },
        { score: '8-7', w: 10, l: 0 },
    ];

    html += `
        <div class="card">
            <div class="card-title">💰 ELO за матч (1x1)</div>
            <p style="color:#8a8ab0;font-size:13px;margin-bottom:12px;">
                Матч идёт до <b>8 побед</b>. ELO зависит от счёта.
            </p>
            <table>
                <thead>
                    <tr style="color:#8a8ab0;font-size:11px;text-transform:uppercase;">
                        <th style="text-align:left;">Счёт</th>
                        <th style="text-align:center;">Победитель</th>
                        <th style="text-align:center;">Проигравший</th>
                    </tr>
                </thead>
                <tbody>
    `;

    eloTable.forEach(e => {
        html += `
            <tr style="border-top:1px solid #252540;">
                <td style="color:#fff;font-weight:600;">${e.score}</td>
                <td style="text-align:center;color:#4caf50;font-weight:600;">+${e.w}</td>
                <td style="text-align:center;color:#ff5252;font-weight:600;">${e.l}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;

    const calibTable = [
        { wins: '5/5', level: 8 },
        { wins: '4/5', level: 6 },
        { wins: '3/5', level: 4 },
        { wins: '2/5', level: 3 },
        { wins: '1/5', level: 2 },
        { wins: '0/5', level: 1 },
    ];

    html += `
        <div class="card">
            <div class="card-title">🎯 Калибровка</div>
            <p style="color:#8a8ab0;font-size:13px;margin-bottom:12px;">
                <b>Первые 5 матчей</b> — калибровка. ELO не начисляется,<br>
                вместо этого определяется <b>стартовый уровень</b>:
            </p>
            <table>
                <tbody>
    `;

    calibTable.forEach(c => {
        html += `
            <tr style="border-top:1px solid #252540;">
                <td style="color:#8a8ab0;">${c.wins} побед</td>
                <td style="text-align:right;font-weight:600;color:#ffd700;">
                    Уровень ${c.level}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;

    html += `
        <div class="card">
            <div class="card-title">🏆 Правила турниров</div>
            <ul>
                <li>Формат — <b>1x1</b>, матч до <b>8 побед</b></li>
                <li>Размер — <b>2, 4, 8, 16</b> игроков (single elimination)</li>
                <li>Перед матчем — <b>добавьте соперника в друзья</b> в игре</li>
                <li>После матча — <b>отправьте счёт и скриншот</b> боту</li>
                <li>Результат <b>подтверждает админ</b> турнира</li>
                <li>Проигравший — <b>выбывает</b> из сетки</li>
            </ul>
        </div>

        <div class="card">
            <div class="card-title">🔐 Верификация</div>
            <ul>
                <li>Укажи <b>ID в игре</b> (буквы, цифры, <code>_</code>)</li>
                <li>ID должен быть <b>уникальным</b></li>
                <li>После отправки — <b>админ проверит</b></li>
                <li>Верификация нужна <b>для участия</b> в турнирах</li>
            </ul>
        </div>

        <div class="card">
            <div class="card-title">📈 Как растёт ELO</div>
            <ul>
                <li>Стартовый ELO — <b>100</b></li>
                <li>Максимальный ELO — <b>25000</b></li>
                <li>За победу — <b>+10 … +50</b> ELO</li>
                <li>За поражение — <b>-10 … -50</b> ELO</li>
                <li>Уровень обновляется <b>автоматически</b></li>
            </ul>
        </div>

        <div class="card">
            <div class="card-title">📞 Связь с админом</div>
            <p style="color:#c0c0d0;font-size:14px;">
                Если возник вопрос — напиши админу:
            </p>
            <a href="https://t.me/amirzovgod" target="_blank"
               style="display:inline-block;margin-top:12px;padding:12px 24px;
                      background:linear-gradient(90deg,#ffd700,#ff8c00);color:#000;
                      border-radius:10px;font-weight:600;">
                💬 @amirzovgod
            </a>
        </div>
    `;

    c.innerHTML = html;
}