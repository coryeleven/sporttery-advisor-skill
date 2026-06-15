## HTML 模板（当前 V5.5 风格）

> **⚠️ 以下模板仅规定视觉格式和 DOM 结构。**
>
> 模板中的赛事名称、球队名称、固定奖金、比分、金额均为**占位符示例**，不代表任何分析建议。
> **严禁将模板示例中的具体对阵或选择复制到输出中。** 所有实际内容必须来自：
> 1. 官方 API 实时数据（赛事、球队、固定奖金）；
> 2. 你自主做出的分析决策（选场、方向、比分、金额）。

生成 HTML 时，必须使用以下完整模板结构。每一处 class、每一层嵌套都必须与模板一致。

### 整体页面结构

```
page
├── hero（居中对齐）
│   ├── kicker（FIFA WORLD CUP 2026 · AI 智能分析）
│   ├── hero-title（主标题 + 金色点缀）
│   ├── hero-copy（一句话描述）
│   ├── meta（北京时间 / 数据源 / 赛事日期）
│   └── summary-grid（4 张摘要卡片：场次 / 资金 / 方案 / 不买区）
├── overview
│   ├── overview-head（标题 + "官方 API 实时抓取"标注）
│   └── table-shell（赛事表）
│       └── table
│           ├── thead（列头）
│           └── tbody（每场一行）
├── board（4 列 CSS Grid）
│   ├── plan-card（方案一：稳健保底）
│   ├── plan-card.value（方案二：价值发现）
│   ├── plan-card.danger（方案三：高危搏杀）
│   └── plan-card.matrix（方案四：矩阵对冲）
└── fine-print（风险提示）
```

### CSS 变量体系（必须使用 :root 定义）

```css
:root {
    --bg: #f2f4f8;
    --card: #ffffff;
    --ink: #1a1d24;
    --muted: #6b7280;
    --pill: #f3f4f6;
    --line: #e5e7eb;
    --green: #16a34a;
    --orange: #ea580c;
    --red: #dc2626;
    --blue: #2563eb;
    --gold: #d97706;
    --gold-light: #fef3c7;
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04);
}
```

### 整体排版规范

- 页面 `max-width: 1600px`，居中
- `body` 背景色 `var(--bg)`，字体 `-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC"`
- 全局 `padding: 48px 40px`

### Hero 区规范

Kicker：
```html
<div class="kicker">FIFA WORLD CUP 2026 · AI 智能分析</div>
```
- 金色文字 + 淡金背景 + 金色边框，圆角胶囊形
- `::before { content: "⚽"; }`

主标题：
```html
<h1 class="hero-title">2026年世界杯<span>体彩AI分析</span></h1>
```
- `font-weight: 900`，金色 `<span>` 点缀

Hero 描述：
```html
<p class="hero-copy">基于竞彩网官方 API 实时数据，AI 自主分析赛事趋势与盘口结构，生成可执行的资金分配方案。</p>
```

Meta 行（日期和时间来自实时获取的北京时间和 API `matchDate`）：
```html
<div class="meta">北京时间：{{YYYY年MM月DD日 HH:MM:SS}} ｜ 数据源：竞彩网官方 API ｜ 赛事日期：{{YYYY-MM-DD}}（{{周X}}）</div>
```

摘要卡片（4 列 Grid）：
```html
<div class="summary-grid">
    <div class="summary-card"><b>N</b><span>场可售世界杯赛事</span></div>
    <div class="summary-card"><b>M</b><span>元运作资金</span></div>
    <div class="summary-card"><b>4</b><span>套 AI 分析方案</span></div>
    <div class="summary-card"><b>N</b><span>场深盘不买区</span></div>
</div>
```
- `summary-card b` 为 36px 金色大字 `var(--gold)`
- `summary-card span` 为 13px 灰色标签

### 表格列结构

```
| 时间 / 小组 / 赛事 | 对阵 | 胜平负 胜/平/负 | 让球 | 让球胜平负 胜/平/负 | 总进球(最可能3个) | 可售玩法 |
```

细节：
- 前两列 `text-align: left`，其余列 `text-align: center`
- 表头 `background: #f9fafb`，`font-size: 12px`，`text-transform: uppercase`，`letter-spacing: 1px`
- 表头下加「赔率」小字标注（10px, `#9ca3af`）
- 每行 `padding: 18px 20px`，`tr:hover` 变 `#f9fafb`
- 总进球列只展示赔率最低的 3 个（绿色 `#16a34a` 加粗）
- 表格容器 `border-radius: 16px`，`box-shadow: var(--shadow)`

### 对阵列格式

```html
<td class="col-left hl">{{国旗}} {{主队名}} VS {{客队名}} {{国旗}}</td>
```
- 必须带国旗 emoji（根据球队英文国别码映射，如 GER→🇩🇪, NET→🇳🇱, JPN→🇯🇵）
- `class="hl"` 金色加粗（`color: var(--gold); font-weight: 800`）
- 未开售 HAD 的场次用 `odds-na`（灰色斜体 `#d1d5db`）

### 时间/小组/赛事列格式

```html
<td class="col-left">
    <div class="match-cell">
        <div class="time">{{HH:MM}}</div>
        <div class="group">{{小组名}}第{{N}}轮</div>
        <div class="headline">{{AI自创赛事标题}}</div>
        <div class="venue">{{比赛城市}}</div>
    </div>
</td>
```
- `time`: 18px 黑色加粗，来自 API `matchTime`
- `group`: 12px 灰色，根据 `leagueAbbName` + 小组信息拼接
- `headline`: 13px 金色加粗，AI 自主创作（见下方「赛事标题」规则）
- `venue`: 11px 浅灰，来自 API `remark` 字段解析

### 可售玩法标签

```html
<span class="play-tag main">胜平负</span>
<span class="play-tag main">让球胜平负</span>
<span class="play-tag main">猜比分</span>
<span class="play-tag sub">总进球</span>
```
- `play-tag.main`：绿色底 + 灰色文字（主要玩法：HAD、HHAD、CRS、HAFU）
- `play-tag.sub`：浅灰底 + 浅灰文字（次要玩法：TTG 等）
- 仅标注 API 中实际可售的玩法；不可售的玩法不出现

### 赛事标题

每条赛事的 `headline` 由 AI 自主创作，要求：

- **长度**：4-8 个中文字符
- **风格**：小红书/社交媒体风格，有记忆点但不浮夸
- **来源**：基于对阵双方的国家/球队绰号、核心球员、历史交锋梗、赛事语境
- **每一场都必须不同**，不能泛泛用"XX 对阵 XX"

创作方法（不是固定答案）：
1. 球队绰号法：如德国→「战车」、荷兰→「橙衣军团」、日本→「蓝武士」、科特迪瓦→「非洲大象」
2. 核心球员法：如瑞典→「伊萨克携手哲凯赖什」、挪威→「哈兰德带队出击」
3. 赛事语境法：如首轮→「首秀」「首战」「揭幕」、生死战→「背水一战」
4. 对阵反差法：强弱悬殊→「战车碾压」、势均力敌→「死亡对决」

⚠️ **以下为历史示例，仅供格式参考。当前 API 返回的赛事可能完全不同，禁止照搬。**

### 方案棋盘（board）

4 列 CSS Grid：
```css
.board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 48px; }
```

响应式：
```css
@media (max-width: 1200px) { .board { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px)  { .board { grid-template-columns: 1fr; } }
```

### 方案卡片完整结构

每一张方案卡片必须包含以下全部层级（以下为结构模板，{{...}} 表示由 AI 自主填充的内容）：

```html
<article class="plan-card [value|danger|matrix]">
    <div class="card-accent"></div>
    <div class="card-body">
        <div class="card-head">
            <h1>{{方案名称}}</h1>
            <div class="tag">{{标签文字}}</div>
        </div>
        <div class="teams">{{对阵一}}<br>{{对阵二 或省略}}</div>
        <div class="action">✓ {{玩法描述}}</div>
        <div class="detail-list">
            <div class="detail-row"><span>{{键}}</span><span>{{值}}</span></div>
            <div class="detail-row"><span>建议</span><span style="color:var(--accent);font-weight:700">{{【必买/可选/可不买/按序执行】}} {{说明}}</span></div>
        </div>
        <p class="reason">{{选择理由，一句话}}</p>
        <div class="spacer"></div>
        <div class="divider"></div>
        <div class="return-section">
            <div class="return-label">{{返还标签}}</div>
            <div class="return-amount">{{金额}}</div>
            <div class="return-sub">{{详细拆解}}</div>
        </div>
    </div>
</article>
```

卡片 CSS 关键规则：
```css
.plan-card {
    --accent: var(--green); --accent-bg: #f0fdf4;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: var(--shadow);
    display: flex; flex-direction: column;
    min-height: 520px;
    overflow: hidden;
}
.plan-card.value   { --accent: var(--orange); --accent-bg: #fff7ed; }
.plan-card.danger   { --accent: var(--red);    --accent-bg: #fef2f2; }
.plan-card.matrix   { --accent: var(--blue);   --accent-bg: #eff6ff; }
.card-accent { height: 4px; background: var(--accent); }
.card-head h1 { color: var(--accent); font-size: 22px; font-weight: 800; }
.tag { background: var(--pill); border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: var(--muted); }
.teams { font-size: 17px; font-weight: 800; }
.action { background: var(--accent-bg); border-radius: 12px; padding: 14px 16px; font-size: 14px; font-weight: 700; }
.detail-row { display: grid; grid-template-columns: 70px 1fr; gap: 12px; font-size: 13px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
.detail-row span:first-child { color: var(--muted); font-weight: 700; font-size: 12px; }
.reason { color: var(--muted); font-size: 13px; margin: 0; }
.spacer { flex: 1; }
.divider { border-top: 1px solid var(--line); margin: 16px 0 12px; }
.return-label { color: var(--muted); font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.return-amount { color: var(--accent); font-size: 28px; font-weight: 900; }
.return-sub { color: var(--muted); font-size: 11px; margin-top: 8px; }
```

### 方案卡片内容细则

> 以下规定每张卡片的 **detail-row 字段顺序和标签文字**（保证输出格式一致），
> 但每个字段的**值由 AI 自主填充**。不同模型的填充结果必须不同。

#### 方案一（稳健保底）— 绿色 accent

- `card-head h1`：「稳健保底」
- `tag`：「主票 XX元」（XX = 实际金额）
- `teams`：两场对阵（各一行，国旗 + VS）
- `action`：玩法描述（如「让球胜平负 2串1复式：XXX + XXX」）
- `detail-list` 必须包含 5 行 detail-row：
  1. 第一关：对阵｜让球数｜勾选结果
  2. 第二关：对阵｜让球数｜勾选结果（单关时此行写「无第二关」）
  3. 买法：2串1复式｜倍数｜金额
  4. 条件：两场都命中才返还；错一场不中
  5. 建议：`color: var(--green)` + 【必买】标签 + 说明
- `reason`：选择理由（一句话）
- `return-label`：「命中组合理论返还」
- `return-amount`：「XXX - XXX 元」
- `return-sub`：各组合返还金额拆解

#### 方案二（价值发现）— 橙色 accent

- `card-head h1`：「价值发现」
- `tag`：「可选加仓」
- `teams`：单场对阵
- `action`：玩法描述
- `detail-list` 5 行：
  1. 赛事：对阵｜让球数
  2. 选择：勾选的具体结果
  3. 买法：单关复式｜倍数｜金额
  4. 提醒：出票页不支持单关则跳过
  5. 建议：`color: var(--orange)` + 【可选】标签
- `return-label`：「预计回款」
- `return-amount`：「XXX - XXX 元」
- `return-sub`：各结果返还
- 若无合格单关场次，`teams` 写「无合格场次」，`action` 写「本方案跳过」，其余元素空或省略

#### 方案三（高危搏杀）— 红色 accent

- `card-head h1`：「高危搏杀」
- `tag`：「比分冷门」
- `teams`：单场对阵
- `action`：猜比分：X:X（X元）
- `detail-list` 5 行：
  1. 赛事：对阵
  2. 选择：CRS 猜比分：X:X
  3. 买法：比分单挑｜倍数｜金额
  4. 边界：小额冷门仓，不追加本金
  5. 建议：`color: var(--red)` + 【可不买】标签
- `return-label`：「命中比分理论返还」
- `return-amount`：「XXX 元」
- `return-sub`：比分赔率提示

#### 方案四（矩阵对冲）— 蓝色 accent

- `card-head h1`：「矩阵对冲」
- `tag`：「资金分配」
- `teams`：「系统拆分 M 元本金」（M = 预算总额）
- `action`：主票(XX) + 加仓(XX) + 冷门(XX) = M元
- `detail-list` 5 行：
  1. 优先级：先买主票XX元；用满预算再补后两张
  2. 不买：深盘赛事及原因
  3. 逻辑：总体策略方向
  4. 总额：XX + XX + XX = M 元，全部2元倍数
  5. 建议：`color: var(--blue)` + 【按序执行】标签
- `reason`：对冲逻辑概述
- `return-label`：「执行顺序」
- `return-amount`：「XX → XX → XX」
- `return-sub` 省略或写空

### 页脚

```html
<p class="fine-print">
    北京时间：YYYY年MM月DD日 HH:MM:SS ｜ 赛事日期：YYYY-MM-DD（周X）｜ 数据源：竞彩网官方 API<br>
    HHAD=让球胜平负 ｜ HAD=胜平负 ｜ CRS=猜比分 ｜ 赛事标题来源：小红书世界杯频道 ｜ 本页由 AI 实时分析生成，不构成投注建议。
</p>
```

### AI 购买建议标签

- 【必买】— 核心方案，必须执行（方案一）
- 【可选】— 预算允许再买（方案二）
- 【可不买】— 概率低，不中属正常（方案三）
- 【按序执行】— 按优先级执行（方案四）

### 不买区展示

深盘赛事在表格中以加背景色行 (`tr` 加样式) 标记，并在方案四的「不买」行中列出。不要单独生成独立的不买区 section。深盘行样式：`background: #fef2f2`，让球数字红色加粗。
