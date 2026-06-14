#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_URL = "https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry?channel=c";
const OUT_FILE = path.join(__dirname, "daily_sporttery_advisor_v4_2026-06-14.html");
const CURRENT_FILE = path.join(__dirname, "daily_sporttery_advisor_2026-06-14.html");

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        }).on("error", reject);
    });
}

function num(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function money(value) {
    return `${value.toFixed(2)} 元`;
}

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function goalLine(match) {
    const raw = match.hhad?.goalLine;
    if (!raw) return 0;
    return num(raw.replace("+", "")) || 0;
}

function odds(match, play, key) {
    return num(match[play]?.[key]);
}

function findMatch(matches, predicate) {
    return matches.find(predicate);
}

function hhadPick(match, key) {
    const labels = { h: "让胜", d: "让平", a: "让负" };
    return { label: labels[key], odds: odds(match, "hhad", key) };
}

function buildSlip(matches) {
    const skip = matches.filter((match) => Math.abs(goalLine(match)) >= 3);
    const awayFav = findMatch(matches, (match) => goalLine(match) === 1 && odds(match, "had", "a") && odds(match, "had", "a") < 2.6);
    const homeFavs = matches.filter((match) => goalLine(match) === -1 && odds(match, "had", "h") && odds(match, "had", "h") < 2.05);
    const lowHomeFav = homeFavs.find((match) => odds(match, "ttg", "s1") && odds(match, "ttg", "s2") && odds(match, "ttg", "s4") && odds(match, "ttg", "s4") >= 6);
    const otherHomeFav = homeFavs.find((match) => match !== lowHomeFav) || homeFavs[0];

    const main = {
        title: "主票",
        amount: 32,
        type: "2串1复式",
        multiple: 4,
        note: "只买这一张也可以。它不是押冷门赢球，而是押热门不一定穿盘。",
        legs: [
            {
                match: awayFav,
                play: "让球胜平负",
                line: awayFav?.hhad?.goalLine,
                picks: ["h", "d"].map((key) => hhadPick(awayFav, key)),
                instruction: "勾选：让胜、让平"
            },
            {
                match: lowHomeFav,
                play: "让球胜平负",
                line: lowHomeFav?.hhad?.goalLine,
                picks: ["d", "a"].map((key) => hhadPick(lowHomeFav, key)),
                instruction: "勾选：让平、让负"
            }
        ].filter((leg) => leg.match)
    };

    const boost = {
        title: "可选加仓",
        amount: 12,
        type: "单场复式",
        multiple: 3,
        note: "如果你想把 50 元用满，再买这一张；如果出票页不支持单关，就直接跳过。",
        leg: otherHomeFav && {
            match: otherHomeFav,
            play: "让球胜平负",
            line: otherHomeFav.hhad?.goalLine,
            picks: ["d", "a"].map((key) => hhadPick(otherHomeFav, key)),
            instruction: "勾选：让平、让负"
        }
    };

    const needle = {
        title: "小额冷门",
        amount: 6,
        type: "比分单挑",
        multiple: 3,
        note: "这张只负责冷门想象，不要加大。不中很正常，中了用来覆盖冷门溢价。",
        leg: otherHomeFav && {
            match: otherHomeFav,
            play: "猜比分",
            line: "无",
            picks: [{ label: "1:1", odds: odds(otherHomeFav, "crs", "s01s01") }],
            instruction: "勾选：1:1"
        }
    };

    return { main, boost, needle, skip };
}

function legTitle(leg) {
    return `${leg.match.matchNumStr}｜${leg.match.homeTeamAbbName} VS ${leg.match.awayTeamAbbName}`;
}

function pickText(picks) {
    return picks.map((pick) => `${pick.label} ${pick.odds?.toFixed(2) || "-"}`).join("｜");
}

function mainReturns(slip) {
    if (slip.legs.length < 2) return [];
    const stakePerCombo = 2 * slip.multiple;
    const [a, b] = slip.legs;
    const rows = [];
    for (const first of a.picks) {
        for (const second of b.picks) {
            rows.push({
                label: `${first.label} × ${second.label}`,
                amount: stakePerCombo * first.odds * second.odds
            });
        }
    }
    return rows;
}

function singleReturns(slip) {
    if (!slip.leg) return [];
    const stakePerPick = 2 * slip.multiple;
    return slip.leg.picks.map((pick) => ({
        label: pick.label,
        amount: stakePerPick * pick.odds
    }));
}

function returnsText(rows) {
    return rows.map((row) => `${row.label}：${money(row.amount)}`).join("｜");
}

function renderLeg(leg) {
    return `<div class="leg">
        <b>${esc(legTitle(leg))}</b>
        <span>${esc(leg.play)} ${esc(leg.line)}｜${esc(leg.instruction)}｜${esc(pickText(leg.picks))}</span>
    </div>`;
}

function renderPlanDetailRows(rows) {
    return rows.map((row) => `<div class="detail-row"><span>${esc(row.label)}</span><span>${esc(row.value)}</span></div>`).join("");
}

function renderMainDetailRows(slip) {
    const rows = slip.legs.map((leg, index) => ({
        label: index === 0 ? "第一关" : "第二关",
        value: `${leg.match.matchNumStr} ${leg.match.homeTeamAbbName} VS ${leg.match.awayTeamAbbName}｜让球 ${leg.line}｜${leg.instruction}`
    }));
    rows.push({
        label: "买法",
        value: `让球胜平负 ${slip.type}｜${slip.multiple} 倍｜金额 ${yuan(slip.amount)} 元`
    });
    rows.push({
        label: "条件",
        value: "两场都命中所选让球结果才返还；错一场则主票不中。"
    });
    return renderPlanDetailRows(rows);
}

function renderBoostDetailRows(slip) {
    if (!slip.leg) return "";
    return renderPlanDetailRows([
        {
            label: "赛事",
            value: `${slip.leg.match.matchNumStr} ${slip.leg.match.homeTeamAbbName} VS ${slip.leg.match.awayTeamAbbName}｜让球 ${slip.leg.line}`
        },
        {
            label: "选择",
            value: `${slip.leg.instruction}；覆盖热门只赢 1 球、打平或冷门方向。`
        },
        {
            label: "买法",
            value: `让球胜平负 ${slip.type}｜${slip.multiple} 倍｜金额 ${yuan(slip.amount)} 元`
        },
        {
            label: "提醒",
            value: "如果实际出票页不支持单关，这一张直接跳过。"
        }
    ]);
}

function renderNeedleDetailRows(slip) {
    if (!slip.leg) return "";
    return renderPlanDetailRows([
        {
            label: "赛事",
            value: `${slip.leg.match.matchNumStr} ${slip.leg.match.homeTeamAbbName} VS ${slip.leg.match.awayTeamAbbName}`
        },
        {
            label: "选择",
            value: `猜比分：${slip.leg.picks.map((pick) => pick.label).join(" / ")}`
        },
        {
            label: "买法",
            value: `${slip.type}｜${slip.multiple} 倍｜金额 ${yuan(slip.amount)} 元`
        },
        {
            label: "边界",
            value: "这张只占小额冷门仓，不因为赔率高而加码。"
        }
    ]);
}

function yuan(value) {
    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function returnRange(rows) {
    if (!rows.length) return "待核验";
    const values = rows.map((row) => row.amount);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `${yuan(max)} 元` : `${yuan(min)} - ${yuan(max)} 元`;
}

function matchName(match) {
    return `${match.homeTeamAbbName} vs ${match.awayTeamAbbName}`;
}

function legMatchName(leg) {
    return matchName(leg.match);
}

function shortLegPick(leg) {
    const signedLine = leg.line && leg.line !== "无" ? `(${leg.line})` : "";
    return `${leg.match.homeTeamAbbName}${signedLine}${leg.picks.map((pick) => pick.label).join("/")}`;
}

function availablePlays(match) {
    const plays = [];
    if (Object.keys(match.had || {}).length) plays.push("胜平负");
    if (Object.keys(match.hhad || {}).length) plays.push("让球胜平负");
    if (Object.keys(match.ttg || {}).length) plays.push("总进球数");
    if (Object.keys(match.crs || {}).length) plays.push("猜比分");
    if (Object.keys(match.hafu || {}).length) plays.push("半全场");
    return plays.join("、");
}

function matchTime(match) {
    return `${match.matchDate} ${(match.matchTime || "").slice(0, 5)}`;
}

function renderPage(day, matches, slip, generatedAt) {
    const total = slip.main.amount + slip.boost.amount + slip.needle.amount;
    const mainRange = returnRange(mainReturns(slip.main));
    const boostRange = returnRange(singleReturns(slip.boost));
    const needleRange = returnRange(singleReturns(slip.needle));
    const mainTeams = slip.main.legs.map(legMatchName).join("<br>");
    const mainPick = slip.main.legs.map(shortLegPick).join(" + ");
    const boostTeam = slip.boost.leg ? legMatchName(slip.boost.leg) : "可选加仓";
    const boostPick = slip.boost.leg ? shortLegPick(slip.boost.leg) : "跳过";
    const needleTeam = slip.needle.leg ? legMatchName(slip.needle.leg) : "小额冷门";
    const needlePick = slip.needle.leg ? slip.needle.leg.picks.map((pick) => pick.label).join(" / ") : "跳过";
    const skipText = slip.skip.length
        ? slip.skip.map((match) => `${match.homeTeamAbbName} vs ${match.awayTeamAbbName} ${match.hhad?.goalLine} 深盘`).join("；")
        : "无";
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>竞彩观察 Skill V4 简化买法</title>
    <style>
        :root {
            --bg: #f4f7fb;
            --card: #ffffff;
            --ink: #202124;
            --muted: #999ca6;
            --pill: #f1f2f7;
            --line: #eceef3;
            --green: #34c759;
            --orange: #ff9500;
            --red: #ff3b30;
            --blue: #007aff;
            --shadow: 0 22px 48px rgba(40, 52, 72, 0.08);
        }
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
            background: var(--bg);
            color: var(--ink);
            margin: 0;
            padding: 72px 56px;
            letter-spacing: 0;
        }
        .page {
            max-width: 1840px;
            width: 100%;
            margin: 0 auto;
        }
        .hero {
            text-align: center;
            margin: 0 auto 36px;
            max-width: 1180px;
        }
        .kicker {
            display: inline-flex;
            align-items: center;
            color: #2c7a54;
            background: rgba(52, 199, 89, 0.09);
            border: 1px solid rgba(52, 199, 89, 0.18);
            border-radius: 999px;
            padding: 8px 14px;
            font-size: 12px;
            font-weight: 850;
            margin-bottom: 16px;
        }
        .hero-title {
            font-size: clamp(34px, 5vw, 58px);
            line-height: 1.04;
            font-weight: 900;
            margin: 0;
        }
        .hero-copy {
            color: var(--muted);
            font-size: 17px;
            line-height: 1.68;
            margin: 16px auto 0;
            max-width: 760px;
            font-weight: 650;
        }
        .meta {
            color: #9b9faa;
            font-size: 13px;
            line-height: 1.6;
            margin-top: 14px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin: 28px auto 0;
        }
        .summary-card {
            background: rgba(255, 255, 255, 0.86);
            border: 1px solid #e8ebf1;
            border-radius: 16px;
            padding: 16px 18px;
            text-align: left;
            box-shadow: 0 12px 34px rgba(40, 52, 72, 0.045);
        }
        .summary-card b {
            display: block;
            font-size: 24px;
            line-height: 1.1;
            font-weight: 900;
        }
        .summary-card span {
            color: var(--muted);
            display: block;
            font-size: 12px;
            line-height: 1.45;
            margin-top: 4px;
            font-weight: 700;
        }
        .overview {
            margin: 0 0 34px;
        }
        .overview-head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 14px;
        }
        .overview-title {
            font-size: 24px;
            line-height: 1.2;
            font-weight: 900;
            margin: 0;
        }
        .overview-note {
            color: var(--muted);
            font-size: 13px;
            line-height: 1.7;
            margin: 0;
            max-width: 660px;
            font-weight: 650;
        }
        .table-shell {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #e8ebf1;
            border-radius: 20px;
            box-shadow: var(--shadow);
            overflow: auto;
        }
        table {
            width: 100%;
            min-width: 920px;
            border-collapse: collapse;
        }
        th, td {
            border-bottom: 1px solid var(--line);
            padding: 16px 18px;
            font-size: 13px;
            line-height: 1.55;
            text-align: left;
            font-weight: 700;
        }
        th {
            color: #858a96;
            background: #fafbfe;
            font-weight: 850;
        }
        tr:last-child td { border-bottom: none; }
        td:first-child, td:nth-child(4) {
            color: var(--ink);
            font-weight: 900;
        }
        .board {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 24px;
            align-items: start;
        }
        .plan-card {
            --accent: var(--green);
            min-height: 405px;
            background: var(--card);
            border: 1px solid #e8ebf1;
            border-radius: 24px;
            padding: 28px;
            box-shadow: var(--shadow);
            display: flex;
            flex-direction: column;
        }
        .plan-card.value { --accent: var(--orange); }
        .plan-card.danger { --accent: var(--red); }
        .plan-card.matrix { --accent: var(--blue); }
        .card-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 24px;
        }
        h1 {
            color: var(--accent);
            font-size: 24px;
            line-height: 1.18;
            margin: 0;
            font-weight: 850;
        }
        .tag {
            color: #8f929c;
            background: var(--pill);
            border-radius: 999px;
            padding: 8px 13px;
            font-size: 15px;
            line-height: 1;
            font-weight: 850;
            white-space: nowrap;
        }
        .teams {
            min-height: 68px;
            font-size: 20px;
            line-height: 1.42;
            font-weight: 850;
            margin-bottom: 20px;
        }
        .action {
            background: #f0f1f6;
            border-radius: 15px;
            padding: 16px 18px;
            color: var(--ink);
            font-size: 18px;
            line-height: 1.45;
            font-weight: 850;
            margin-bottom: 18px;
        }
        .detail-list {
            display: grid;
            gap: 10px;
            margin: 0 0 18px;
        }
        .detail-row {
            display: grid;
            grid-template-columns: 88px 1fr;
            gap: 12px;
            border-bottom: 1px solid #f0f1f5;
            padding: 0 0 10px;
            font-size: 15px;
            line-height: 1.55;
            font-weight: 760;
        }
        .detail-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .detail-row span:first-child {
            color: var(--muted);
            font-weight: 850;
        }
        .detail-row span:last-child {
            color: var(--ink);
        }
        .reason {
            color: var(--muted);
            font-size: 16px;
            line-height: 1.6;
            font-weight: 650;
            margin: 0;
        }
        .spacer { flex: 1; }
        .divider {
            border-top: 1px solid var(--line);
            margin: 28px 0 20px;
        }
        .return-label {
            color: var(--muted);
            font-size: 16px;
            line-height: 1.3;
            font-weight: 800;
            margin-bottom: 10px;
        }
        .return-amount {
            color: var(--accent);
            font-size: 35px;
            line-height: 1.1;
            font-weight: 900;
        }
        .return-sub {
            color: var(--muted);
            font-size: 13px;
            line-height: 1.55;
            font-weight: 700;
            margin-top: 10px;
        }
        .fine-print {
            color: #a0a3ad;
            font-size: 12px;
            line-height: 1.7;
            margin-top: 24px;
            text-align: center;
        }
        @media (max-width: 1180px) {
            .board { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
            body { padding: 28px 16px 44px; }
            .board { grid-template-columns: 1fr; gap: 18px; }
            .overview-head { display: block; }
            .overview-title { margin-bottom: 8px; }
            .table-shell { overflow: visible; }
            table { min-width: 0; }
            thead { display: none; }
            table, tbody, tr, td { display: block; width: 100%; }
            tr { padding: 12px 14px; border-bottom: 1px solid var(--line); }
            tr:last-child { border-bottom: none; }
            td {
                border-bottom: none;
                padding: 6px 0;
                display: grid;
                grid-template-columns: 106px 1fr;
                gap: 12px;
            }
            td::before {
                color: var(--muted);
                font-size: 12px;
                font-weight: 850;
            }
            td:nth-child(1)::before { content: "编号"; }
            td:nth-child(2)::before { content: "时间"; }
            td:nth-child(3)::before { content: "赛事"; }
            td:nth-child(4)::before { content: "对阵"; }
            td:nth-child(5)::before { content: "让球"; }
            td:nth-child(6)::before { content: "可售玩法"; }
            .plan-card { min-height: auto; padding: 24px; border-radius: 20px; }
            .card-head { margin-bottom: 22px; }
            h1 { font-size: 24px; }
            .teams { min-height: auto; font-size: 20px; }
            .detail-row { grid-template-columns: 78px 1fr; }
            .return-amount { font-size: 30px; }
        }
    </style>
</head>
<body>
<div class="page">
    <section class="hero">
        <div class="kicker">SPORTTERY SKILL V4 · 北京时间赛事观察</div>
        <div class="hero-title">竞彩观察 Skill V4 简化买法</div>
        <p class="hero-copy">上半部分保留赛事口径和当天赛程；下半部分只给可执行的三张票和一张资金矩阵，减少选择负担。</p>
        <div class="meta">抓取时间：${esc(generatedAt)}｜官方接口：竞彩网 getMatchCalculatorV1｜赛事业务日：${esc(day.businessDate)}</div>
        <div class="summary-grid">
            <div class="summary-card"><b>${matches.length} 场</b><span>当前业务日可售世界杯赛事</span></div>
            <div class="summary-card"><b>${yuan(total)} 元</b><span>全部执行模拟预算</span></div>
            <div class="summary-card"><b>3 张</b><span>主票、加仓、冷门</span></div>
            <div class="summary-card"><b>1 场</b><span>深盘赛事进入不买区</span></div>
        </div>
    </section>

    <section class="overview">
        <div class="overview-head">
            <h2 class="overview-title">当前赛事情况</h2>
            <p class="overview-note">先把当天可售比赛、让球和可售玩法摆出来；下面的方案只从这些比赛里筛选，不再把每场都塞进买法。</p>
        </div>
        <div class="table-shell">
            <table>
                <thead>
                    <tr>
                        <th>赛事编号</th>
                        <th>开赛北京时间</th>
                        <th>赛事</th>
                        <th>对阵</th>
                        <th>让球</th>
                        <th>官方可售玩法</th>
                    </tr>
                </thead>
                <tbody>
                    ${matches.map((match) => `
                    <tr>
                        <td>${esc(match.matchNumStr)}</td>
                        <td>${esc(matchTime(match))}</td>
                        <td>${esc(match.leagueAbbName || match.leagueAllName)}</td>
                        <td>${esc(match.homeTeamAbbName)} VS ${esc(match.awayTeamAbbName)}</td>
                        <td>${esc(match.hhad?.goalLine || "无")}</td>
                        <td>${esc(availablePlays(match))}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>
    </section>

    <div class="board">
        <article class="plan-card">
            <div class="card-head">
                <h1>稳健保底</h1>
                <div class="tag">主票 ${yuan(slip.main.amount)}元</div>
            </div>
            <div class="teams">${mainTeams}</div>
            <div class="action">✓ ${esc(slip.main.type)}：${esc(mainPick)}</div>
            <div class="detail-list">
                ${renderMainDetailRows(slip.main)}
            </div>
            <p class="reason">依据：前几场热门连续受阻，主票不押胜负正路，专门覆盖受让保护和热门只小胜/不胜。</p>
            <div class="spacer"></div>
            <div class="divider"></div>
            <div class="return-label">命中组合理论返还</div>
            <div class="return-amount">${esc(mainRange)}</div>
            <div class="return-sub">四种命中组合分别约为：${esc(returnsText(mainReturns(slip.main)))}</div>
        </article>

        <article class="plan-card value">
            <div class="card-head">
                <h1>价值发现</h1>
                <div class="tag">防冷加仓</div>
            </div>
            <div class="teams">${esc(boostTeam)}</div>
            <div class="action">✓ 单场：${esc(boostPick)}</div>
            <div class="detail-list">
                ${renderBoostDetailRows(slip.boost)}
            </div>
            <p class="reason">依据：热门方有优势，但小组赛早段容易出现一球小胜、让球不穿或平局，加仓只做可选。</p>
            <div class="spacer"></div>
            <div class="divider"></div>
            <div class="return-label">预计回款</div>
            <div class="return-amount">${esc(boostRange)}</div>
            <div class="return-sub">${esc(returnsText(singleReturns(slip.boost)))}</div>
        </article>

        <article class="plan-card danger">
            <div class="card-head">
                <h1>高危搏杀</h1>
                <div class="tag">比分冷门</div>
            </div>
            <div class="teams">${esc(needleTeam)}</div>
            <div class="action">✓ 猜比分：${esc(needlePick)}（${yuan(slip.needle.amount)}元）</div>
            <div class="detail-list">
                ${renderNeedleDetailRows(slip.needle)}
            </div>
            <p class="reason">依据：1:1 是热门不穿盘里最典型的冷门比分，只用小额覆盖，不追加本金。</p>
            <div class="spacer"></div>
            <div class="divider"></div>
            <div class="return-label">命中比分理论返还</div>
            <div class="return-amount">${esc(needleRange)}</div>
            <div class="return-sub">${esc(returnsText(singleReturns(slip.needle)))}</div>
        </article>

        <article class="plan-card matrix">
            <div class="card-head">
                <h1>矩阵对冲</h1>
                <div class="tag">资金分配</div>
            </div>
            <div class="teams">系统自动拆分 ${yuan(total)} 元本金</div>
            <div class="action">主票(${slip.main.amount}) + 加仓(${slip.boost.amount}) + 冷门(${slip.needle.amount})</div>
            <div class="detail-list">
                <div class="detail-row"><span>优先级</span><span>先买主票 32 元；想用满预算，再买加仓 12 元和冷门 6 元。</span></div>
                <div class="detail-row"><span>不买</span><span>德国 VS 库拉索｜-3 深盘，赢球但不穿盘的区间太宽。</span></div>
                <div class="detail-row"><span>逻辑</span><span>不追热门大胜；主线押让球保护，小额覆盖冷门比分。</span></div>
                <div class="detail-row"><span>总额</span><span>32 + 12 + 6 = 50 元，全部为 2 元倍数。</span></div>
            </div>
            <p class="reason">依据：先买主票，想用满预算再补后两张；${esc(skipText)} 放入不买区，避免深盘误伤。</p>
            <div class="spacer"></div>
            <div class="divider"></div>
            <div class="return-label">执行顺序</div>
            <div class="return-amount">32 + 12 + 6 元</div>
        </article>
    </div>
    <p class="fine-print">抓取时间：${esc(generatedAt)}｜赛事业务日：${esc(day.businessDate)}｜本页是规则调试与赛前观察演示，不构成投注建议。</p>
</div>
</body>
</html>`;
}

async function main() {
    const payload = await fetchJson(API_URL);
    const day = payload.value.matchInfoList[0];
    const matches = day.subMatchList;
    const slip = buildSlip(matches);
    const generatedAt = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false
    });
    const html = renderPage(day, matches, slip, generatedAt);
    fs.writeFileSync(OUT_FILE, html, "utf8");
    fs.writeFileSync(CURRENT_FILE, html, "utf8");
    console.log(`generated ${OUT_FILE}`);
    console.log(`updated ${CURRENT_FILE}`);
    console.log(`main ${money(slip.main.amount)} boost ${money(slip.boost.amount)} needle ${money(slip.needle.amount)}`);
    console.log(`main legs: ${slip.main.legs.map(legTitle).join(" + ")}`);
    if (slip.boost.leg) console.log(`boost: ${legTitle(slip.boost.leg)}`);
    if (slip.needle.leg) console.log(`needle: ${legTitle(slip.needle.leg)} 1:1`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
