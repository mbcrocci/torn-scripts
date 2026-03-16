// ==UserScript==
// @name         Stock Manager & Advisor v7.6
// @namespace    TheALFA.torn.stocks
// @version      7.6.3
// @description  Secure stock vault using the Torn API. Mobile optimized. Smart ROI Advisor included.
// @author       TheALFA [2869953]
// @match        https://www.torn.com/page.php?sid=stocks*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_xmlhttpRequest
// @connect      tornsy.com
// @downloadURL https://update.greasyfork.org/scripts/561390/Stock%20Manager%20%20Advisor%20v76.user.js
// @updateURL https://update.greasyfork.org/scripts/561390/Stock%20Manager%20%20Advisor%20v76.meta.js
// ==/UserScript==

// --- CONFIGURATION ---
const DEFAULT_PRESETS = ["50k", "250k", "1m", "5m", "10m", "25m"];

const STOCK_DATA = {
  ASS: { base: 1_000_000, type: "A" },
  BAG: { base: 3_000_000, type: "A" },
  CNC: { base: 7_500_000, type: "A" },
  EWM: { base: 1_000_000, type: "A" },
  ELT: { base: 5_000_000, type: "P" },
  EVL: { base: 100_000, type: "A" },
  FHG: { base: 2_000_000, type: "A" },
  GRN: { base: 500_000, type: "A" },
  CBD: { base: 350_000, type: "A" },
  HRG: { base: 10_000_000, type: "A" },
  IIL: { base: 1_000_000, type: "P" },
  IOU: { base: 3_000_000, type: "A" },
  IST: { base: 100_000, type: "P" },
  LAG: { base: 750_000, type: "A" },
  LOS: { base: 7_500_000, type: "P" },
  LSC: { base: 500_000, type: "A" },
  MCS: { base: 350_000, type: "A" },
  MSG: { base: 300_000, type: "P" },
  MUN: { base: 5_000_000, type: "A" },
  PRN: { base: 1_000_000, type: "A" },
  PTS: { base: 10_000_000, type: "A" },
  SYM: { base: 500_000, type: "A" },
  SYS: { base: 3_000_000, type: "P" },
  TCP: { base: 1_000_000, type: "P" },
  TMI: { base: 6_000_000, type: "A" },
  TGP: { base: 2_500_000, type: "P" },
  TCT: { base: 100_000, type: "A" },
  TSB: { base: 3_000_000, type: "A" },
  TCC: { base: 7_500_000, type: "A" },
  THS: { base: 150_000, type: "A" },
  TCI: { base: 1_500_000, type: "P" },
  TCM: { base: 1_000_000, type: "P" },
  WSU: { base: 1_000_000, type: "P" },
  WLT: { base: 9_000_000, type: "P" },
  YAZ: { base: 1_000_000, type: "P" },
};

// --- ADVISOR CONSTANTS ---
const ADVISOR_ITEMS = {
  // Boosters & Drugs (Cost Calc)
  206: "Xanax",
  367: "Feathery Hotel Coupon",

  // Energy Drinks (Cans)
  530: "Can of Munster",
  532: "Can of Red Cow",
  533: "Can of Taurine Elite",
  553: "Can of Santa Shooters",
  554: "Can of Rockstar Rudolph",
  555: "Can of X-MASS",
  985: "Can of Goose Juice",
  986: "Can of Damp Valley",
  987: "Can of Crocozade",

  // Stock Benefit Items
  364: "Box of Grenades",
  365: "Box of Medical Supplies",
  366: "Erotic DVD",
  368: "Lawyer's Business Card",
  369: "Lottery Voucher",
  370: "Drug Pack",
  817: "Six-Pack of Alcohol",
  818: "Six-Pack of Energy Drink",

  // Caches (TCC)
  1057: "Gentleman's Cache",
  1112: "Elegant Cache",
  1113: "Naughty Cache",
  1114: "Elderly Cache",
  1115: "Denim Cache",
  1116: "Wannabe Cache",
  1117: "Cutesy Cache",
};
const TCC_CACHE_IDS = [1057, 1112, 1113, 1114, 1115, 1116, 1117];

const ADVISOR_DATA = {
  MUN: { type: "item", id: 818, freq: 7 },
  ASS: { type: "item", id: 817, freq: 7 },
  HRG: { type: "manual", label: "Avg Property Value", freq: 31 },
  LSC: { type: "item", id: 369, freq: 7 },
  LAG: { type: "item", id: 368, freq: 7 },
  FHG: { type: "item", id: 367, freq: 7 },
  PRN: { type: "item", id: 366, freq: 7 },
  SYM: { type: "item", id: 370, freq: 7 },
  TCC: { type: "average", ids: TCC_CACHE_IDS, freq: 31 },
  THS: { type: "item", id: 365, freq: 7 },
  EWM: { type: "item", id: 364, freq: 7 },
  BAG: { type: "passive" },
  CNC: { type: "cash", val: 80_000_000, freq: 31 },
  TSB: { type: "cash", val: 50_000_000, freq: 31 },
  TMI: { type: "cash", val: 25_000_000, freq: 31 },
  IOU: { type: "cash", val: 12_000_000, freq: 31 },
  GRN: { type: "cash", val: 4_000_000, freq: 31 },
  TCT: { type: "cash", val: 1_000_000, freq: 31 },
};

let autoSyncTimer = null; // Stores the auto-refresh timer ID
let portfolioTransactions = {}; // Stores buy history
let lastNwCache = null; // Stores the last known networth data
let lastSync = 0;
let itemPrices = {};
try {
  itemPrices = JSON.parse(localStorage.getItem("alfa_advisor_prices")) || {};
} catch (e) {
  itemPrices = {};
}

let networthSettings = {
  sources: { inventory: false, points: true, stocks: true },
  excludedStocks: [],
  excludeMode: "all",
};
try {
  let savedNW = JSON.parse(localStorage.getItem("alfa_advisor_networth"));
  if (savedNW) {
    networthSettings = savedNW;
    if (!networthSettings.excludeMode) networthSettings.excludeMode = "all";
  }
} catch (e) {}

const BANK_BASE_RATES = {
  "1w": 0.7917,
  "2w": 1.7833,
  "1m": 4.3,
  "2m": 9.8,
  "3m": 16.5,
};
let bankSettings = {
  roi_1w: 0,
  roi_2w: 0,
  roi_1m: 0,
  roi_2m: 0,
  roi_3m: 0,
  active_period: "2w",
};
try {
  let savedBank = JSON.parse(localStorage.getItem("alfa_advisor_bank"));
  if (savedBank) bankSettings = savedBank;
} catch (e) {}

let stocks = {},
  stockId = {},
  stockRows = {},
  localShareCache = {};

// NEW: Load saved transactions from storage on startup
try {
  portfolioTransactions =
    JSON.parse(localStorage.getItem("alfa_advisor_transactions")) || {};
} catch (e) {
  portfolioTransactions = {};
}

// --- UTILITIES ---
function createModal(title, contentHtml) {
  // 1. If a modal is already open, hide it (don't delete it!)
  if ($(".alfa-modal").length > 0) {
    $(".alfa-modal").last().hide();
  }

  // 2. Create the new overlay and modal
  // We add a class 'alfa-overlay-layer' so we can track them
  let modal = `
        <div class="alfa-modal-overlay alfa-overlay-layer">
            <div class="alfa-modal">
                <div class="alfa-modal-header">
                    <h3>${title}</h3>
                    <span class="alfa-modal-close">&times;</span>
                </div>
                <div class="alfa-modal-body">${contentHtml}</div>
            </div>
        </div>`;

  $("body").append(modal);

  // 3. Logic for the Close button
  $(".alfa-modal-close")
    .last()
    .on("click", function () {
      // Remove the current (top) layer
      $(this).closest(".alfa-modal-overlay").remove();

      // Show the previous layer if it exists
      if ($(".alfa-modal").length > 0) {
        $(".alfa-modal").last().show();
      }
    });
}

function parseTornNumber(val) {
  if (typeof val !== "string") return 0;
  val = val.trim().toLowerCase();
  if (!val) return 0;
  if (val.endsWith("k")) return parseFloat(val.replace("k", "")) * 1_000;
  if (val.endsWith("m")) return parseFloat(val.replace("m", "")) * 1_000_000;
  if (val.endsWith("b"))
    return parseFloat(val.replace("b", "")) * 1_000_000_000;
  return parseFloat(val.replace(/,/g, ""));
}

function formatMoney(amount) {
  return "$" + amount.toLocaleString("en-US");
}
function formatNumberToKMB(num) {
  if (num === 0) return "0";
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return (num / 1e9).toFixed(3).replace(/\.?0+$/, "") + "b";
  if (absNum >= 1e6) return (num / 1e6).toFixed(2).replace(/\.?0+$/, "") + "m";
  if (absNum >= 1e3) return (num / 1e3).toFixed(1).replace(/\.?0+$/, "") + "k";
  return num.toLocaleString();
}
function getRFC() {
  var c = document.cookie.match(/rfc_v=([^;]+)/);
  return c ? c[1] : "";
}

function getBenefitTier(sym, shares) {
  let data = STOCK_DATA[sym];
  if (!data) return { tier: 0, next: 0, label: "Unknown" };
  if (data.type === "P")
    return shares >= data.base
      ? { tier: 1, next: data.base }
      : { tier: 0, next: data.base };
  let multiplier = 1;
  while (shares >= data.base * (multiplier * 2)) {
    multiplier *= 2;
  }
  return shares < data.base
    ? { tier: 0 }
    : { tier: multiplier, next: data.base * multiplier * 2 };
}

// 1. Force API Sync
async function syncWallet(silent = false) {
  let key = localStorage.getItem("alfa_vault_apikey");
  if (!key) return 0;
  if (Date.now() - lastSync < 2000) return 0;
  lastSync = Date.now();
  if (!silent) $("#responseStock").html("Syncing...").css("color", "orange");
  try {
    const response = await fetch(
      `https://api.torn.com/user/?selections=money&key=${key}&ts=${Date.now()}`,
    );
    const data = await response.json();
    if (data.money_onhand !== undefined) {
      let money = data.money_onhand;
      if ($("#user-money").length > 0)
        $("#user-money")
          .attr("data-money", money)
          .text("$" + money.toLocaleString());
      if (!silent)
        $("#responseStock")
          .html(`Synced: $${money.toLocaleString()}`)
          .css("color", "green");
      return money;
    }
  } catch (e) {
    if (!silent) $("#responseStock").html("Sync Failed").css("color", "red");
  }
  return 0;
}

// 2. Read Money from Screen
function getMoneyFast() {
  let dataMoney = $("#user-money").attr("data-money");
  if (dataMoney) return parseFloat(dataMoney);
  let textMoney = $("#user-money").text();
  return textMoney ? parseTornNumber(textMoney) : 0;
}

// --- INITIALIZATION ---
function insert() {
  let current = localStorage.alfa_vault_target;
  let savedKey = localStorage.getItem("alfa_vault_apikey") || "";
  if ($("ul[class^='stock_']").length == 0) {
    setTimeout(insert, 500);
    return;
  }

  let symbols = [];
  $("ul[class^='stock_']").each(function () {
    let sym = $("img", $(this)).attr("src").split("logos/")[1].split(".svg")[0];
    symbols.push(sym);
    stockId[sym] = $(this).attr("id");
    stocks[sym] = $("div[class^='price_']", $(this));
    stockRows[sym] = $(this);
  });
  symbols.sort();

  let container = `
    <div class="alfa-container">
        <div id="alfa-pl-container" style="background:#1a1a1a; border:1px solid #333; border-radius:6px; padding:8px 12px; margin-bottom:12px;">
            <div id="alfa-pl-display" style="color:#666; font-size:11px; text-align:center;">
                Waiting for API Sync... <button id="alfa-force-sync" style="background:none; border:none; color:#609b9b; cursor:pointer; text-decoration:underline;">Sync Now</button>
            </div>
        </div>

        <div class="alfa-header">
            <input type="password" id="alfa-apikey" class="alfa-input" style="flex-grow:1; text-align:center; letter-spacing:2px;" placeholder="Paste API Key Here" value="${savedKey}">
            <span id="alfa-advisor-btn" class="alfa-advisor-btn">★ Advisor</span>
            <span id="alfa-trade-btn" class="alfa-advisor-btn" style="border-color: #8bc34a; margin-left: 5px;">📈 Trade Assistant</span>
        </div>

        <div class="alfa-row">
            <label class="alfa-label">Target:</label>
            <select id="stockid" class="alfa-select"><option value="">Select Stock...</option>`;

  for (let sy of symbols)
    container += `<option value="${sy}" ${current == sy ? "selected" : ""}>${sy}</option>`;

  container += `</select><span id="alfa-owned-display" style="margin-left:10px; font-size:11px; color:#888;">Owned: -</span></div>
    <div class="alfa-divider"></div>

    <div class="alfa-row">
        <button id="vaultall" class="alfa-main-btn">Vault Max</button>
        <label class="alfa-small-label"><input type="checkbox" id="alfa-use-api" ${localStorage.getItem("alfa_vault_use_api") === "true" ? "checked" : ""}> API Mode</label>
        <div class="alfa-group" style="margin-left: auto;">
            <input type="text" placeholder="Keep Amt" id="keepval" class="alfa-input" style="width:100px;" value="${localStorage.getItem("alfa_vault_keepVal") || ""}">
            <button id="vaultexcept" class="alfa-main-btn">Vault (Keep)</button>
        </div>
    </div>

    <div class="alfa-row">
        <div class="alfa-group">
            <input type="text" placeholder="Withdraw Amt" id="sellval" class="alfa-input" value="${localStorage.getItem("alfa_vault_sellVal") || ""}">
            <button id="sellamt" class="alfa-main-btn">Withdraw</button>
        </div>
        <div style="display: flex; align-items: center; margin-left: auto;">
            <button id="sellall-init" class="alfa-main-btn" style="color:#aaa; border-color:#444;">Withdraw All</button>
            <div id="sellall-confirm" style="display:none; gap:5px;">
                <button id="sellall-yes" class="alfa-main-btn" style="color:#8bc34a; border-color:#8bc34a;">Yes</button>
                <button id="sellall-no" class="alfa-main-btn" style="color:#ef5350; border-color:#ef5350;">No</button>
            </div>
        </div>
    </div>

    <div class="alfa-toolbar">
        <div style="display:flex; gap:15px;">
            <label class="alfa-small-label"><input type="checkbox" id="alfa-instant-toggle" ${localStorage.getItem("alfa_vault_instant") === "true" ? "checked" : ""}> Instant</label>
            <label class="alfa-small-label"><input type="checkbox" id="alfa-lock-toggle" ${localStorage.getItem("alfa_vault_lock") === "true" ? "checked" : ""}> Lock Benefits</label>
            <label class="alfa-small-label" title="Replaces presets with your active RR Tracker bets + $1k"><input type="checkbox" id="alfa-rrbets-toggle" ${localStorage.getItem("alfa_vault_rrbets") === "true" ? "checked" : ""}> 🎲 RR Bets</label>
        </div>
        <span id="alfa-edit-trigger" class="alfa-link" style="font-size:11px;">Edit Buttons</span>
    </div>
    <div id="alfa-preset-row" class="alfa-preset-row"></div>
    <div class="alfa-row" style="margin-top:10px;"><span id="responseStock"></span></div>
    </div>`;

  $("#stockmarketroot").prepend(container);

  // LISTENERS
  $("#alfa-advisor-btn").on("click", openAdvisorMain);
  $("#stockid").change(updateStock);
  $("#vaultall").on("click", vault);
  $("#vaultexcept").on("click", vaultExcept);
  $("#sellamt").on("click", () => withdraw());
  $("#alfa-apikey").on("keyup change", function () {
    localStorage.setItem("alfa_vault_apikey", $(this).val().trim());
  });
  $("#alfa-instant-toggle").on("change", function () {
    localStorage.setItem("alfa_vault_instant", $(this).is(":checked"));
  });
  $("#alfa-lock-toggle").on("change", function () {
    localStorage.setItem("alfa_vault_lock", $(this).is(":checked"));
  });
  $("#alfa-use-api").on("change", function () {
    localStorage.setItem("alfa_vault_use_api", $(this).is(":checked"));
  });
  $("#alfa-rrbets-toggle").on("change", function () {
    localStorage.setItem("alfa_vault_rrbets", $(this).is(":checked"));
    renderPresets();
  });

  // Real-time synchronization! Auto-updates buttons if you change bets in another tab
  window.addEventListener("storage", (e) => {
    if (
      e.key === "rr_exported_bets" &&
      localStorage.getItem("alfa_vault_rrbets") === "true"
    ) {
      renderPresets();
    }
  });
  $("#sellval").on("keyup", function () {
    handleInputUpdate(this, "alfa_vault_sellVal");
  });
  $("#keepval").on("keyup", function () {
    handleInputUpdate(this, "alfa_vault_keepVal");
  });
  $("#alfa-edit-trigger").on("click", renderEditMode);
  $("#alfa-trade-btn").on("click", openTradeAssistant);
  $("#sellall-init").on("click", function () {
    $(this).hide();
    $("#sellall-confirm").css("display", "flex");
  });
  $("#sellall-no").on("click", function () {
    $("#sellall-confirm").hide();
    $("#sellall-init").show();
  });
  $("#sellall-yes").on("click", function () {
    withdrawAll();
    $("#sellall-confirm").hide();
    $("#sellall-init").show();
  });

  // Sync Button
  $("#alfa-force-sync").on("click", function () {
    fetchUserPortfolio();
  });

  renderPresets();
  updateStock();

  // 1. Instant Load from Cache
  if (Object.keys(portfolioTransactions).length > 0) {
    updatePortfolioPerformance();
  }

  // 2. Start Auto-Sync (30 Seconds)
  if (autoSyncTimer) clearInterval(autoSyncTimer); // Clear any old timer
  autoSyncTimer = setInterval(function () {
    if ($("#alfa-pl-container").length > 0) {
      // Only sync if the box exists on screen
      fetchUserPortfolio();
    } else {
      // If user left page, stop timer
      clearInterval(autoSyncTimer);
    }
  }, 30000); // 30000ms = 30 seconds
}

// --- CORE FUNCTIONS ---
function getOwnedShares(id) {
  if (localShareCache[id] !== undefined) return localShareCache[id];
  let row = stockRows[id];
  if (!row) return 0;
  let mobileEl = row.find("p[class^='count']");
  if (mobileEl.length > 0)
    return parseFloat(mobileEl.text().replace(/,/g, "")) || 0;
  let cols = row.children("div");
  if (cols.length >= 5)
    return parseFloat($(cols[4]).text().replace(/,/g, "")) || 0;
  return 0;
}

function updateStock() {
  let symb = $("#stockid").val();
  localStorage.alfa_vault_target = symb;
  if (symb) {
    let owned = getOwnedShares(symb);
    $("#alfa-owned-display").html(
      `Owned: <strong style="color:${owned > 0 ? "#609b9b" : "#666"}">${owned.toLocaleString()}</strong>`,
    );
  } else $("#alfa-owned-display").text("Owned: -");
}

function updateLocalCache(sym, amt) {
  let current = getOwnedShares(sym);
  localShareCache[sym] = Math.max(0, current + amt);
  updateStock();
}

function openDiagnosticTool() {
  let simRows = [];
  let symbols = Object.keys(STOCK_DATA);
  let safeNw = lastNwCache || {
    liquid: 0,
    pureCash: 0,
    bankActive: false,
    bankPrincipal: 0,
  };

  let savedState = JSON.parse(localStorage.getItem("alfa_advisor_diag_state"));
  const checkOwnership = (id, liveStatus) => {
    if (savedState && savedState.checked)
      return savedState.checked.includes(id);
    return liveStatus;
  };

  const IGNORED = ["BAG", "EVL", "CBD", "MCS"];

  for (let sym of symbols) {
    if (IGNORED.includes(sym)) continue;
    let sData = STOCK_DATA[sym];
    if (sData.type === "P" && sym !== "PTS") continue;
    let price = getPrice(sym);
    if (price === 0) continue;
    let dailyYield = getDailyYield(sym);
    let increment = sData.base;
    let owned = getOwnedShares(sym);
    if (sym === "PTS") {
      let ptsPrice = itemPrices["points"] || 0;
      if (ptsPrice > 0) dailyYield = (ptsPrice * 100) / 7;
    }
    let currentRealTier = 0;
    if (owned >= increment) {
      if (sData.type === "P") currentRealTier = owned >= increment ? 1 : 0;
      else currentRealTier = Math.floor(Math.log2(owned / increment + 1));
    }
    let maxTier = sData.type === "P" ? 1 : 5;
    for (let i = 1; i <= maxTier; i++) {
      let id = `${sym}-${i}`;
      let tierShares =
        sData.type === "P" ? increment : increment * Math.pow(2, i - 1);
      let tierCost = tierShares * price;
      let tierRoi = tierCost > 0 ? ((dailyYield * 365) / tierCost) * 100 : 0;
      let isOwnedLive = i <= currentRealTier;
      let isOwned = checkOwnership(id, isOwnedLive);
      simRows.push({
        id: id,
        name: sym,
        tier: i,
        roi: tierRoi,
        cost: tierCost,
        isOwned: isOwned,
        sym: sym,
      });
    }
  }

  let bankPrincipal = safeNw.bankActive ? safeNw.bankPrincipal : 2_000_000_000;
  if (savedState && savedState.bankAmount)
    bankPrincipal = parseInt(savedState.bankAmount);
  let bankLocked = safeNw.bankActive;
  if (savedState && savedState.bankLocked !== undefined)
    bankLocked = savedState.bankLocked;

  ["3m"].forEach((term) => {
    let rate = bankSettings["roi_" + term] || 0;
    if (rate > 0) {
      let id = `BANK-${term}`;
      let isOwnedLive = safeNw.bankActive;
      let isOwned = checkOwnership(id, isOwnedLive);
      simRows.push({
        id: id,
        name: `City Bank (${term})`,
        tier: 0,
        roi: rate,
        cost: bankPrincipal,
        isOwned: isOwned,
        sym: "BANK",
        isLocked: bankLocked,
        investedAmount: bankPrincipal,
      });
    }
  });

  let calculatedInvested = 0;
  simRows.forEach((r) => {
    if (r.isOwned) calculatedInvested += r.cost;
  });
  let startCash = savedState
    ? savedState.cash
    : safeNw.pureCash + calculatedInvested;
  simRows.sort((a, b) => b.roi - a.roi);
  window.simRowsData = simRows;

  let tableRows = simRows
    .map((r) => {
      let nameDisplay =
        r.sym === "BANK"
          ? r.name
          : `${r.name} <span style="color:#666; font-size:9px;">(T${r.tier})</span>`;
      let extraInputs =
        r.sym === "BANK"
          ? `
            <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                <input type="text" class="sim-bank-amt alfa-tbl-input" data-id="${r.id}" value="${r.investedAmount.toLocaleString("en-US")}" style="width:90px; font-size:10px; padding:2px;">
                <label style="display:flex; align-items:center; font-size:9px; color:#888; cursor:pointer;">
                    <input type="checkbox" class="sim-bank-lock" data-id="${r.id}" ${r.isLocked ? "checked" : ""}> Lock
                </label>
            </div>`
          : "";
      return `<tr id="row-${r.id}" class="sim-row"><td style="text-align:center; vertical-align:middle;"><input type="checkbox" class="sim-check" data-id="${r.id}" ${r.isOwned ? "checked" : ""}></td><td>${nameDisplay}${extraInputs}</td><td style="text-align:right; vertical-align:top; padding-top:8px;">${r.roi.toFixed(2)}%</td><td style="text-align:right; vertical-align:top; padding-top:8px;">${formatMoney(r.cost)}</td></tr>`;
    })
    .join("");

  let html = `
    <div style="background:#222; padding:10px; border-bottom:1px solid #444; position:sticky; top:0; z-index:10;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <button id="sim-back-btn" class="alfa-mini-btn" style="border-color:#666; color:#ccc; margin-left:0;">Back</button>
                <span style="font-weight:bold; color:#ccc; margin-left:5px;">Capital:</span>
                <input id="sim-cash" class="alfa-tbl-input" style="width:100px; font-weight:bold; color:#fff;" value="${startCash.toLocaleString("en-US")}">
            </div>
            <button id="sim-reset-btn" class="alfa-mini-btn" style="border-color:#eebb44; color:#eebb44;">Reset to Live</button>
        </div>
        <div style="display:flex; justify-content:space-between; background:#111; padding:6px; border-radius:4px; margin-bottom:8px; font-size:11px;">
            <div>Invested: <span id="sim-total-invested" style="color:#eebb44; font-weight:bold;">$0</span></div>
            <div>Cash Left: <span id="sim-cash-left" style="color:#fff; font-weight:bold;">$0</span></div>
        </div>
        <div style="font-size:10px; color:#888; display:flex; flex-wrap:wrap; gap:8px;">
            <span><span style="color:#66bb6a">●</span> Best ROI</span>
            <span><span style="color:#42a5f5">●</span> Affordable</span>
            <span><span style="color:#eebb44">●</span> Next Goal</span>
            <span><span style="color:#ef5350">●</span> Sell This</span>
        </div>
    </div>
    <div style="height:55vh; overflow-y:auto;">
        <table class="alfa-table" style="width:100%;">
            <thead><tr><th style="width:30px;">Own</th><th>Stock/Bank</th><th style="text-align:right;">ROI</th><th style="text-align:right;">Cost</th></tr></thead>
            <tbody id="sim-tbody">${tableRows}</tbody>
        </table>
    </div>`;

  createModal("Diagnostic Tool", html);

  const updateHighlights = () => {
    let simTotalCap = parseTornNumber($("#sim-cash").val());
    let totalInvested = 0;
    let checkedIds = [];
    let bankState = { amount: 0, locked: false };
    $(".sim-check").each(function () {
      let id = $(this).data("id");
      let row = window.simRowsData.find((r) => r.id === id);
      if (row) {
        row.isOwned = $(this).is(":checked");
        if (row.sym === "BANK") {
          let amtInput = $(`.sim-bank-amt[data-id="${id}"]`).val();
          let lockInput = $(`.sim-bank-lock[data-id="${id}"]`).is(":checked");
          row.cost = parseTornNumber(amtInput);
          row.isLocked = lockInput;
          bankState = { amount: row.cost, locked: row.isLocked };
        }
        if (row.isOwned) {
          checkedIds.push(id);
          totalInvested += row.cost;
        }
      }
    });

    localStorage.setItem(
      "alfa_advisor_diag_state",
      JSON.stringify({
        cash: simTotalCap,
        checked: checkedIds,
        bankAmount: bankState.amount,
        bankLocked: bankState.locked,
      }),
    );
    let cashLeft = simTotalCap - totalInvested;
    $("#sim-total-invested").text(formatMoney(totalInvested));
    let leftEl = $("#sim-cash-left");
    leftEl.text(formatMoney(cashLeft));
    leftEl.css("color", cashLeft < 0 ? "#ef5350" : "#8bc34a");
    $(".sim-row").css("background", "transparent");

    let candidates = window.simRowsData.filter((r) => !r.isOwned);
    let bankRow = window.simRowsData.find((r) => r.sym === "BANK" && r.isOwned);
    if (bankRow && !bankRow.isLocked && bankRow.cost < 2_000_000_000) {
      candidates.push({
        id: "BANK_GAP",
        roi: bankRow.roi,
        cost: 2_000_000_000 - bankRow.cost,
        sym: "BANK",
      });
      candidates.sort((a, b) => b.roi - a.roi);
    }
    let sellableAssets = window.simRowsData.filter(
      (r) => r.isOwned && !(r.sym === "BANK" && r.isLocked),
    );

    let scoredCandidates = candidates.map((cand) => {
      let sellPower = 0;
      for (let asset of sellableAssets) {
        if (asset.roi < cand.roi) sellPower += asset.cost;
      }
      let buyingPower = cashLeft + sellPower;
      let gap = cand.cost - buyingPower;
      return { node: cand, gap: gap };
    });

    scoredCandidates.sort((a, b) => {
      if (a.gap <= 0 && b.gap <= 0) return b.node.roi - a.node.roi;
      return a.gap - b.gap;
    });

    let absoluteBest = candidates.length > 0 ? candidates[0] : null;
    const paint = (id, c) =>
      $(`#row-${id === "BANK_GAP" ? bankRow.id : id}`).css("background", c);
    if (absoluteBest) paint(absoluteBest.id, "rgba(102, 187, 106, 0.2)");

    let bestTarget = scoredCandidates.length > 0 ? scoredCandidates[0] : null;
    if (bestTarget) {
      let color =
        bestTarget.gap <= 0
          ? "rgba(66, 165, 245, 0.2)"
          : "rgba(255, 213, 79, 0.2)";
      paint(bestTarget.node.id, color);
      if (bestTarget.gap <= 0 || color === "rgba(255, 213, 79, 0.2)") {
        if (bestTarget.gap <= 0) {
          let required = bestTarget.node.cost - cashLeft;
          let currentSum = 0;
          sellableAssets.sort((a, b) => a.roi - b.roi);
          for (let asset of sellableAssets) {
            if (asset.roi < bestTarget.node.roi) {
              currentSum += asset.cost;
              $(`#row-${asset.id}`).css("background", "rgba(239, 83, 80, 0.2)");
              if (currentSum >= required) break;
            }
          }
        }
      }
    }
  };

  $("#sim-cash, .sim-bank-amt").on("keyup change", updateHighlights);
  $(".sim-bank-lock").on("change", updateHighlights);

  // BACK BUTTON
  $("#sim-back-btn").on("click", function () {
    $("#alfa-modal-overlay").remove();
    openAdvisorMain();
  });

  $("#sim-reset-btn").on("click", function () {
    if (confirm("Discard changes?")) {
      localStorage.removeItem("alfa_advisor_diag_state");
      openDiagnosticTool();
    }
  });
  $(".sim-check").on("change", updateHighlights);
  updateHighlights();
}

function getPrice(id) {
  if (!stocks[id]) return 0;
  return parseFloat($(stocks[id]).text().replace(/,/g, ""));
}
function handleInputUpdate(el, key) {
  let raw = $(el).val(),
    num = parseTornNumber(raw);
  if (
    !isNaN(num) &&
    (raw.endsWith("k") || raw.endsWith("m") || raw.endsWith("b"))
  ) {
    $(el).val(num);
    localStorage.setItem(key, num);
  } else localStorage.setItem(key, raw);
}

function openAdvisorMain() {
  let html = `
    <div class="alfa-dashboard">
        <div class="alfa-hero" id="adv-hero-box">
            <div class="alfa-hero-header" id="adv-hero-trigger" style="cursor:pointer; padding-bottom:5px; border-bottom:1px solid #444; margin-bottom:10px;">
                <div class="alfa-hero-label" style="display:flex; justify-content:center; align-items:center; gap:5px;">
                    Daily Net Profit <span class="alfa-caret">▼</span>
                </div>
            </div>
            <div id="adv-daily-income" class="alfa-hero-val">--</div>
            <div id="adv-daily-detail" class="alfa-hero-sub" style="line-height:1.4; font-size:12px;">Calculating...</div>
            <div id="adv-income-breakdown" class="alfa-breakdown"></div>
        </div>

        <div class="alfa-grid-section">
            <div class="alfa-card" id="adv-card-target">
                <div class="alfa-card-head"><span class="alfa-card-title">Target (Best ROI) <span class="alfa-caret">▼</span></span><span id="adv-next-roi" class="alfa-card-roi">--%</span></div>
                <div class="alfa-card-body">
                    <div id="adv-next-name" class="alfa-stock-name">--</div>
                    <div id="adv-next-cost" class="alfa-stock-cost">Cost: --</div>
                    <div id="adv-next-gain" class="alfa-stock-gain">Gain: --</div>
                    <div id="adv-target-details" class="alfa-card-details"></div>
                </div>
            </div>
            <div class="alfa-card" id="adv-card-afford" style="border-color: #609b9b;">
                <div class="alfa-card-head"><span class="alfa-card-title" style="color:#609b9b;">Best Affordable <span class="alfa-caret">▼</span></span><span id="adv-afford-roi" class="alfa-card-roi">--%</span></div>
                <div class="alfa-card-body">
                    <div id="adv-afford-name" class="alfa-stock-name">--</div>
                    <div id="adv-afford-cost" class="alfa-stock-cost">Cost: --</div>
                    <div id="adv-afford-gain" class="alfa-stock-gain">Gain: --</div>
                    <div id="adv-afford-details" class="alfa-card-details"></div>
                </div>
            </div>
        </div>

        <div class="alfa-actions" style="border-top:none; padding-top:10px; display:block;">
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <button id="adv-btn-items" class="alfa-main-btn" style="flex:1;">Prices</button>

                <button id="adv-btn-costs" class="alfa-main-btn" style="flex:1; border:1px solid #ef5350; color:#ef5350;">Daily Costs</button>
            </div>
            <div style="display:flex; gap:5px;">
                <button id="adv-btn-networth" class="alfa-main-btn" style="flex:1;">Settings</button>
                <button id="adv-diag-btn" class="alfa-main-btn" style="flex:1; border-color:#eebb44; color:#eebb44;">Diagnostic</button>
            </div>
            <div id="adv-cash-display" style="text-align:center; margin-top:10px; font-size:13px; color:#fff; font-weight:bold;">
                Free Cash: ...
            </div>
        </div>
    </div>`;

  createModal("Financial Advisor", html);

  // DELEGATED LISTENERS
  $("body")
    .off("click", "#adv-btn-items")
    .on("click", "#adv-btn-items", function () {
      openItemSettings();
    });
  $("body")
    .off("click", "#adv-btn-networth")
    .on("click", "#adv-btn-networth", function () {
      openNetworthSettings();
    });
  $("body")
    .off("click", "#adv-btn-costs")
    .on("click", "#adv-btn-costs", function () {
      openCostSettings();
    });
  $("body")
    .off("click", "#adv-diag-btn")
    .on("click", "#adv-diag-btn", function () {
      openDiagnosticTool();
    });

  $("#adv-card-target .alfa-card-head")
    .off()
    .on("click", function () {
      $("#adv-target-details").slideToggle(150);
      $(this).find(".alfa-caret").toggleClass("rotated");
    });
  $("#adv-card-afford .alfa-card-head")
    .off()
    .on("click", function () {
      $("#adv-afford-details").slideToggle(150);
    });
  $("#adv-hero-trigger")
    .off()
    .on("click", function () {
      $("#adv-income-breakdown").slideToggle(200);
      $(this).find(".alfa-caret").toggleClass("rotated");
    });

  $("body")
    .off("click", ".alfa-action-sell")
    .on("click", ".alfa-action-sell", function (e) {
      e.stopPropagation();
      sellSmart($(this).data("sym"), parseInt($(this).data("shares")));
    });
  $("body")
    .off("click", ".alfa-action-buy")
    .on("click", ".alfa-action-buy", function (e) {
      e.stopPropagation();
      buySmart($(this).data("sym"), parseInt($(this).data("shares")));
    });

  runAdvisorLogic(true);
  setTimeout(() => runAdvisorLogic(false), 50);
}

// --- ADVISOR LOGIC ---
function getDailyYield(sym) {
  let b = ADVISOR_DATA[sym];
  if (!b) return 0;
  let val = 0;
  if (b.type === "cash") val = b.val;
  else if (b.type === "item") val = itemPrices[b.id] || 0;
  else if (b.type === "manual") val = itemPrices["HRG_AVG"] || 0;
  else if (b.type === "average") {
    let t = 0,
      c = 0;
    for (let cid of b.ids) {
      let p = itemPrices[cid] || 0;
      if (p > 0) {
        t += p;
        c++;
      }
    }
    val = c > 0 ? t / c : 0;
  }
  return val > 0 && b.freq ? val / b.freq : 0;
}

async function getLiquidNetworth(fastMode = false) {
  // If fast mode is requested and we have data, return it immediately (skips slow API)
  if (fastMode && lastNwCache) return lastNwCache;

  let key = localStorage.getItem("alfa_vault_apikey");
  if (!key)
    return {
      liquid: 0,
      pureCash: 0,
      dailyBank: 0,
      bankActive: false,
      bankPrincipal: 0,
    };

  try {
    const res = await fetch(`https://api.torn.com/v2/user/money?key=${key}`);
    const data = await res.json();

    if (!data.money)
      return (
        lastNwCache || {
          liquid: 0,
          pureCash: 0,
          dailyBank: 0,
          bankActive: false,
          bankPrincipal: 0,
        }
      );

    let m = data.money,
      dailyBank = 0,
      bankActive = false,
      bankPrincipal = 0;
    if (m.city_bank && m.city_bank.amount > 0) {
      bankPrincipal = m.city_bank.amount;
      if (m.city_bank.profit > 0 && m.city_bank.duration > 0)
        dailyBank = m.city_bank.profit / m.city_bank.duration;
      bankActive = true;
    }

    let pureCash = m.wallet || 0;
    if (networthSettings.sources.points && m.points > 0)
      pureCash += m.points * (itemPrices["points"] || 45000);

    // Save to cache
    lastNwCache = {
      liquid: 0,
      pureCash: pureCash,
      dailyBank: dailyBank,
      bankActive: bankActive,
      bankPrincipal: bankPrincipal,
    };

    // Calculate Liquid Total (This logic is usually done in Advisor, but we store the base here)
    // Note: The specific stock calculation happens in runAdvisorLogic, so 'liquid' here is just a placeholder or base

    return lastNwCache;
  } catch (e) {
    console.error("NW Error", e);
    return (
      lastNwCache || {
        liquid: 0,
        pureCash: 0,
        dailyBank: 0,
        bankActive: false,
        bankPrincipal: 0,
      }
    );
  }
}

async function runAdvisorLogic(skipApiSync = false) {
  if (!skipApiSync) $("#adv-debug-log").text("Syncing Portfolio...");
  $("#adv-daily-income").text("...");
  try {
    if (!skipApiSync) await fetchUserPortfolio();
    let nwData = await getLiquidNetworth(skipApiSync);
    let liquidCash = nwData.liquid;
    let pureCash = nwData.pureCash;
    let dailyBank = nwData.dailyBank;
    let bankPrincipal = nwData.bankPrincipal;

    let xanPrice = itemPrices[206] || 835000;
    let fhcPrice = itemPrices[367] || 13500000;
    let pointPrice = itemPrices["points"] || 45000;

    // --- SAFE COST CALCULATION ---
    let costs;
    try {
      costs = JSON.parse(localStorage.getItem("alfa_advisor_costs"));
    } catch (e) {}
    if (!costs) costs = {};

    // 1. Basic Consumables
    let costXan = (costs.xanax || 0) * xanPrice;
    let costFhc = (costs.fhc || 0) * fhcPrice;

    // 2. Specific Cans Logic
    let costCans = 0;
    const CAN_IDS = [530, 532, 533, 553, 554, 555, 985, 986, 987];
    CAN_IDS.forEach((id) => {
      let qty = costs[`can_${id}`] || 0;
      if (qty > 0) {
        let p = itemPrices[id] || 0;
        costCans += qty * p;
      }
    });

    // 3. Legacy Can Support (in case user has old 'cans' value but no specific)
    if (costs.cans > 0 && costCans === 0) {
      let defaultCanPrice = itemPrices[530] || 1200000; // Fallback to Munster
      costCans = costs.cans * defaultCanPrice;
    }

    let totalConsumables = costXan + costFhc + costCans;

    // 4. Refills
    let refillCount = 0;
    if (costs.refill_energy) refillCount++;
    if (costs.refill_nerve) refillCount++;
    if (costs.refill_token) refillCount++;
    let totalRefills = refillCount * 30 * pointPrice;

    // 5. Fees
    let dailyDuke = (costs.duke_weekly || 0) / 7;
    let totalFees = dailyDuke + (costs.rehab_daily || 0);
    let totalDailyBurn = totalConsumables + totalRefills + totalFees;

    let currentDailyIncome = 0;
    let liquidAssets = [];
    let ownedBlocks = [];
    let candidates = [];
    let symbols = Object.keys(STOCK_DATA);
    const IGNORED = ["BAG", "EVL", "CBD", "MCS"];

    for (let sym of symbols) {
      if (IGNORED.includes(sym)) continue;
      let isExcluded =
        networthSettings.excludedStocks &&
        networthSettings.excludedStocks.includes(sym);
      let stockData = STOCK_DATA[sym];
      let sharePrice = getPrice(sym);
      if (sharePrice === 0) continue;

      let owned = getOwnedShares(sym);
      let increment = stockData.base;
      let dailyYield = getDailyYield(sym);

      if (sym === "PTS") {
        let ptsPrice = itemPrices["points"] || 0;
        if (ptsPrice > 0) dailyYield = (ptsPrice * 100) / 7;
      }

      let currentLevel = 0;
      if (stockData.type === "P") currentLevel = owned >= increment ? 1 : 0;
      else if (owned >= increment)
        currentLevel = Math.floor(Math.log2(owned / increment + 1));

      let allowSellingBlock = !isExcluded;
      let allowSellingLoose =
        !isExcluded || networthSettings.excludeMode === "active";

      if (currentLevel > 0 && dailyYield > 0) {
        if (stockData.type === "P") {
          let blockCost = increment * sharePrice;
          let blockRoi =
            blockCost > 0 ? ((dailyYield * 365) / blockCost) * 100 : 0;
          currentDailyIncome += dailyYield;
          ownedBlocks.push({
            name: sym,
            tier: 1,
            totalIncome: dailyYield,
            invested: blockCost,
            currentRoi: blockRoi,
          });
          let loose = Math.max(0, owned - increment);
          if (loose > 0 && allowSellingLoose)
            liquidAssets.push({
              name: sym,
              sym: sym,
              val: loose * sharePrice,
              price: sharePrice,
              currentRoi: 0,
            });
          if (allowSellingBlock)
            liquidAssets.push({
              name: sym + " (Block)",
              sym: sym,
              val: increment * sharePrice,
              price: sharePrice,
              currentRoi: blockRoi,
              isBlock: true,
            });
        } else {
          let totalLockedShares = 0;
          for (let i = 1; i <= currentLevel; i++) {
            let tierShares = increment * Math.pow(2, i - 1);
            totalLockedShares += tierShares;
            let tierCost = tierShares * sharePrice;
            let tierRoi =
              tierCost > 0 ? ((dailyYield * 365) / tierCost) * 100 : 0;
            currentDailyIncome += dailyYield;
            ownedBlocks.push({
              name: sym,
              tier: i,
              totalIncome: dailyYield,
              invested: tierCost,
              currentRoi: tierRoi,
            });
            if (allowSellingBlock)
              liquidAssets.push({
                name: `${sym} (Tier ${i})`,
                sym: sym,
                val: tierCost,
                price: sharePrice,
                currentRoi: tierRoi,
                isBlock: true,
              });
          }
          let looseShares = Math.max(0, owned - totalLockedShares);
          if (looseShares > 0 && allowSellingLoose)
            liquidAssets.push({
              name: sym,
              sym: sym,
              val: looseShares * sharePrice,
              price: sharePrice,
              currentRoi: 0,
            });
        }
      } else if (owned > 0 && allowSellingLoose) {
        liquidAssets.push({
          name: sym,
          sym: sym,
          val: owned * sharePrice,
          price: sharePrice,
          currentRoi: 0,
        });
      }

      let isPassive = stockData.type === "P";
      let shouldCheck = !isPassive || (isPassive && currentLevel === 0);
      if (shouldCheck) {
        let candName = sym;
        let targetTotalShares = 0;
        let roiBaseShares = 0;
        if (isPassive) {
          targetTotalShares = increment;
          roiBaseShares = increment;
        } else {
          let nextLevel = currentLevel + 1;
          targetTotalShares = increment * (Math.pow(2, nextLevel) - 1);
          candName = sym + ` (Tier ${nextLevel})`;
          roiBaseShares = increment * Math.pow(2, nextLevel - 1);
        }
        let sharesNeeded = Math.max(0, targetTotalShares - owned);
        if (sharesNeeded > 0 || isPassive) {
          let costToUpgrade = sharesNeeded * sharePrice;
          let marginalCost = roiBaseShares * sharePrice;
          let marginalRoi =
            marginalCost > 0 ? ((dailyYield * 365) / marginalCost) * 100 : 0;
          if (marginalRoi > 0)
            candidates.push({
              name: candName,
              sym: sym,
              roi: marginalRoi,
              cost: costToUpgrade,
              sharesNeeded: sharesNeeded,
              dailyYield: dailyYield,
              totalVal: targetTotalShares * sharePrice,
            });
        }
      }
    }

    if (!nwData.bankActive) {
      ["1w", "2w", "1m", "2m", "3m"].forEach((term) => {
        let rate = bankSettings["roi_" + term];
        if (rate > 0)
          candidates.push({
            name: `City Bank (${term})`,
            sym: "BANK",
            roi: rate,
            cost: 2_000_000_000,
            isBank: true,
            totalVal: 2_000_000_000,
          });
      });
    }

    candidates.sort((a, b) => b.roi - a.roi);
    let totalDailyIncome = currentDailyIncome + dailyBank;
    let netDailyProfit = totalDailyIncome - totalDailyBurn;
    let netColor = netDailyProfit >= 0 ? "#8bc34a" : "#ef5350";

    $("#adv-daily-income").text(formatMoney(Math.floor(totalDailyIncome)));
    $("#adv-daily-detail").html(
      `<span style="color:#ccc">Daily Burn: <span style="color:#ef5350">-${formatMoney(Math.floor(totalDailyBurn))}</span></span><br><span style="color:${netColor}; font-weight:bold;">Net: ${formatMoney(Math.floor(netDailyProfit))}</span>`,
    );
    $("#adv-cash-display").text(`Free Cash: ${formatMoney(pureCash)}`);

    let breakdownHtml = "";
    breakdownHtml += `<div style="font-size:10px; font-weight:bold; color:#888; margin-bottom:4px; text-transform:uppercase;">Income Sources</div>`;
    if (dailyBank > 0) {
      let bankAnnual = dailyBank * 365;
      let bankRoi = bankPrincipal > 0 ? (bankAnnual / bankPrincipal) * 100 : 0;
      breakdownHtml += `<div class="alfa-break-row"><div style="display:flex; justify-content:space-between; width:100%;"><span>City Bank</span><span class="alfa-break-val">${formatMoney(Math.floor(dailyBank))}</span></div></div>`;
    }
    ownedBlocks.sort((a, b) => b.totalIncome - a.totalIncome);
    for (let block of ownedBlocks) {
      let tierLabel = block.tier > 0 ? `(Tier ${block.tier})` : "(Passive)";
      breakdownHtml += `<div class="alfa-break-row"><div style="display:flex; justify-content:space-between; width:100%;"><span>${block.name} <span style="color:#666; font-size:9px;">${tierLabel}</span></span><span class="alfa-break-val">${formatMoney(Math.floor(block.totalIncome))}</span></div></div>`;
    }

    if (totalDailyBurn > 0) {
      breakdownHtml += `<div style="font-size:10px; font-weight:bold; color:#888; margin:10px 0 4px 0; text-transform:uppercase; border-top:1px dashed #333; padding-top:5px;">Daily Costs</div>`;
      if (totalConsumables > 0) {
        breakdownHtml += `<div class="alfa-break-row"><div style="display:flex; justify-content:space-between; width:100%;"><span>Consumables</span><span style="color:#ef5350;">-${formatMoney(Math.floor(totalConsumables))}</span></div></div>`;
      }
      if (totalRefills > 0) {
        breakdownHtml += `<div class="alfa-break-row"><div style="display:flex; justify-content:space-between; width:100%;"><span>Point Refills (${refillCount})</span><span style="color:#ef5350;">-${formatMoney(Math.floor(totalRefills))}</span></div></div>`;
      }
      if (totalFees > 0) {
        breakdownHtml += `<div class="alfa-break-row"><div style="display:flex; justify-content:space-between; width:100%;"><span>Fees</span><span style="color:#ef5350;">-${formatMoney(Math.floor(totalFees))}</span></div></div>`;
      }
    }
    breakdownHtml += `<div style="border-top:1px solid #444; margin-top:5px; padding-top:5px; display:flex; justify-content:space-between; font-weight:bold;"><span>Net Daily Profit</span><span style="color:${netColor}">${formatMoney(Math.floor(netDailyProfit))}</span></div>`;
    $("#adv-income-breakdown").html(breakdownHtml);

    // ... (Keep box rendering logic same as previous) ...
    function calculateLiquidity(target) {
      let owned = 0;
      let alreadyOwnedValue = 0;
      if (!target.isBank) {
        owned = getOwnedShares(target.sym);
        let price = getPrice(target.sym);
        alreadyOwnedValue = owned * price;
      }
      let goal = target.totalVal;
      if (target.isBank) {
        let totalPower =
          pureCash + liquidAssets.reduce((acc, a) => acc + a.val, 0);
        goal = Math.min(totalPower, 2_000_000_000);
        goal = Math.max(goal, 0);
      }
      let startingAssets = pureCash + alreadyOwnedValue;
      let gap = goal - startingAssets;
      let available = pureCash;
      let sources = [];
      let totalLiquid = pureCash;
      liquidAssets.sort((a, b) => a.currentRoi - b.currentRoi);

      for (let asset of liquidAssets) {
        if (!target.isBank && asset.sym === target.sym) continue;
        totalLiquid += asset.val;
        if (gap > 0 && asset.currentRoi < target.roi) {
          gap -= asset.val;
          available += asset.val;
          sources.push(asset);
        }
      }
      let totalResources =
        pureCash +
        alreadyOwnedValue +
        sources.reduce((acc, s) => acc + s.val, 0);
      let finalMissing = Math.max(
        0,
        target.isBank ? 0 : target.totalVal - totalResources,
      );
      return {
        available: available,
        missing: finalMissing,
        sources,
        totalLiquid,
      };
    }

    function buildLiquidityHtml(target, plan) {
      let html = "";
      if (target.isBank)
        html += `<div class="alfa-detail-row"><span>Investment Cap:</span> <span>$2,000,000,000</span></div>`;
      else
        html += `<div class="alfa-detail-row"><span>Target Price:</span> <span>${formatMoney(target.totalVal)}</span></div>`;

      let ownedVal = 0;
      if (!target.isBank) {
        let owned = getOwnedShares(target.sym);
        let price = getPrice(target.sym);
        ownedVal = owned * price;
        if (owned > 0)
          html += `<div class="alfa-detail-row alfa-detail-sub"><span>- Already Owned</span> <span>${formatMoney(ownedVal)}</span></div>`;
      }
      if (pureCash > 0)
        html += `<div class="alfa-detail-row alfa-detail-sub"><span>- Free Cash</span> <span>${formatMoney(pureCash)}</span></div>`;

      if (plan.sources.length > 0) {
        let currentTotal = pureCash + ownedVal;
        let displayGap = target.isBank
          ? 2_000_000_000 - currentTotal
          : target.totalVal - currentTotal;
        for (let src of plan.sources) {
          let sellVal = displayGap > 0 ? Math.min(src.val, displayGap) : 0;
          if (sellVal <= 0) continue;
          displayGap -= sellVal;
          let sellShares = Math.ceil(sellVal / src.price);
          html += `<div class="alfa-detail-row alfa-detail-sub" style="align-items:center;">
                        <span style="display:flex; flex-direction:column; line-height:1.2;"><span>- Sell ${src.name}</span><span style="font-size:9px; color:#555;">(Avail: ${formatMoney(src.val)})</span></span>
                        <button class="alfa-mini-btn alfa-action-sell" data-sym="${src.sym}" data-shares="${sellShares}">Sell ~${formatMoney(sellVal)}</button>
                    </div>`;
        }
      }

      if (plan.missing > 0 && !target.isBank)
        html += `<div class="alfa-detail-row alfa-detail-miss"><span>Still Missing:</span> <span>${formatMoney(plan.missing)}</span></div>`;
      else {
        let amountToInvest = target.isBank
          ? Math.min(plan.available, 2_000_000_000)
          : plan.available;
        html += `<div class="alfa-detail-row alfa-detail-total"><span>Ready to Invest:</span> <span style="color:#fff">${formatMoney(amountToInvest)}</span></div>`;
      }

      if (pureCash > 0 || plan.sources.length > 0) {
        if (target.isBank)
          html += `<a href="https://www.torn.com/bank.php" target="_blank" class="alfa-invest-btn" style="display:block; text-align:center; text-decoration:none; line-height:20px; margin-top:8px; background:#4a6ea9; border-color:#64b5f6;">Open Bank</a>`;
        else if (pureCash > 0) {
          html += `<button class="alfa-invest-btn alfa-action-buy" data-sym="${target.sym}" data-shares="${target.sharesNeeded}">Invest Now</button>`;
        }
      }
      return html;
    }

    let totalLiquidPower =
      pureCash + liquidAssets.reduce((acc, asset) => acc + asset.val, 0);
    let nextBest = candidates[0];

    if (nextBest) {
      $("#adv-next-roi").text(nextBest.roi.toFixed(2) + "%");
      $("#adv-next-name").text(nextBest.name);
      let targetLiq = calculateLiquidity(nextBest);
      $("#adv-target-details").html(buildLiquidityHtml(nextBest, targetLiq));
      if (targetLiq.missing <= 0) {
        if (nextBest.isBank) {
          $("#adv-next-cost").text("Invest Max Cap");
          $("#adv-next-gain").text("Active Banking");
        } else {
          if (targetLiq.sources.length === 0) {
            $("#adv-next-cost").text(formatMoney(nextBest.cost));
            $("#adv-next-gain").text("Buy with Cash");
          } else {
            $("#adv-next-cost").text(
              "Sell " + targetLiq.sources.length + " lower ROI",
            );
            $("#adv-next-gain").text("to buy this");
          }
        }
      } else {
        $("#adv-next-cost").html(
          `<span class="alfa-shortage">Missing ${formatMoney(targetLiq.missing)}</span>`,
        );
        $("#adv-next-gain").text(`Cost: ${formatMoney(nextBest.cost)}`);
      }
    } else {
      $("#adv-next-name").text("Maxed Out!");
      $("#adv-target-details").html("");
    }

    let floorROI = 0;
    if (ownedBlocks.length > 0)
      floorROI = Math.min(...ownedBlocks.map((b) => b.currentRoi));
    let bestOption = null;
    let bestOptionLiq = null;
    let betterCandidates = candidates.filter((c) => {
      if (c.roi <= floorROI) return false;
      if (c.isBank) return true;
      let selfLiquidity = liquidAssets
        .filter((a) => a.sym === c.sym)
        .reduce((acc, a) => acc + a.val, 0);
      return c.cost <= totalLiquidPower - selfLiquidity;
    });
    if (betterCandidates.length > 0) {
      bestOption = betterCandidates[0];
      bestOptionLiq = calculateLiquidity(bestOption);
    } else {
      let cheapCandidates = candidates.filter((c) => {
        if (c.isBank) return true;
        let selfLiquidity = liquidAssets
          .filter((a) => a.sym === c.sym)
          .reduce((acc, a) => acc + a.val, 0);
        return c.cost <= totalLiquidPower - selfLiquidity;
      });
      cheapCandidates.sort((a, b) => b.roi - a.roi);
      if (cheapCandidates.length > 0) {
        bestOption = cheapCandidates[0];
        bestOptionLiq = calculateLiquidity(bestOption);
      }
    }

    if (bestOption) {
      let color = "#609b9b";
      if (nextBest && bestOption.roi < nextBest.roi) color = "#eebb44";
      $("#adv-afford-roi")
        .text(bestOption.roi.toFixed(2) + "%")
        .css("color", color);
      $("#adv-afford-name").text(bestOption.name);
      if (bestOption.isBank) {
        let investAmount = Math.min(totalLiquidPower, 2_000_000_000);
        $("#adv-afford-cost").text("Park Liquid Cash");
        $("#adv-afford-gain").text("Inv: " + formatMoney(investAmount));
      } else {
        let rawGap = bestOption.cost - pureCash;
        if (bestOptionLiq.missing > 0)
          $("#adv-afford-cost").html(
            `<span class="alfa-shortage">Missing: ${formatMoney(bestOptionLiq.missing)}</span>`,
          );
        else if (rawGap > 0)
          $("#adv-afford-cost").text(
            "Sell " + bestOptionLiq.sources.length + " items",
          );
        else $("#adv-afford-cost").text("Ready to Buy").css("color", "#8bc34a");
        $("#adv-afford-gain").text("Cost: " + formatMoney(bestOption.totalVal));
      }
      $("#adv-afford-details").html(
        buildLiquidityHtml(bestOption, bestOptionLiq),
      );
    } else {
      $("#adv-afford-name").text("Portfolio Optimized");
      $("#adv-afford-roi").text("-");
      $("#adv-afford-cost").text("-");
      $("#adv-afford-gain").text("-");
    }
  } catch (e) {
    console.error("Advisor Crash:", e);
  }
}

async function fetchUserPortfolio() {
  let key = localStorage.getItem("alfa_vault_apikey");
  if (!key) return;
  $("#adv-debug-log").text("Syncing Portfolio...");
  try {
    const res = await fetch(
      `https://api.torn.com/user/?selections=stocks&key=${key}&ts=${Date.now()}`,
    );
    const data = await res.json();

    if (data.stocks) {
      let idToSym = {};
      for (let [sym, domId] of Object.entries(stockId)) {
        let cleanId = domId.replace("stock_", "");
        idToSym[cleanId] = sym;
      }

      // 1. Process & Store Data
      portfolioTransactions = {};
      for (let [sID, sData] of Object.entries(data.stocks)) {
        let sym = idToSym[sID];
        if (sym) {
          localShareCache[sym] = sData.total_shares || 0;
          if (sData.transactions) {
            portfolioTransactions[sym] = Object.values(sData.transactions);
          }
        }
      }

      // 2. SAVE to LocalStorage (Persistence Fix)
      localStorage.setItem(
        "alfa_advisor_transactions",
        JSON.stringify(portfolioTransactions),
      );

      // 3. Refresh UI
      for (let sym of Object.keys(stockRows)) {
        let onScreen = getOwnedShares(sym);
        if (onScreen > 0 || localShareCache[sym] !== onScreen) {
          localShareCache[sym] = onScreen;
        }
      }

      $("#adv-debug-log").text("Portfolio Synced.");
      updatePortfolioPerformance(); // Update P/L immediately
    }
  } catch (e) {
    console.error("Portfolio Sync Error", e);
  }
}

function updatePortfolioPerformance() {
  let totalCost = 0;
  let totalValue = 0;

  // Loop through stored transactions
  for (let [sym, transList] of Object.entries(portfolioTransactions)) {
    let currentPrice = getPrice(sym);
    if (!currentPrice || currentPrice === 0) continue; // Skip if price not loaded

    let stockCost = 0;
    let stockShares = 0;

    // Sum up all batches for this stock
    transList.forEach((t) => {
      let s = parseFloat(t.shares);
      let p = parseFloat(t.bought_price);
      stockCost += s * p;
      stockShares += s;
    });

    // Add to Global Totals
    totalCost += stockCost;
    totalValue += stockShares * currentPrice;
  }

  let profit = totalValue - totalCost;
  let profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  let color = profit >= 0 ? "#8bc34a" : "#ef5350"; // Green or Red
  let sign = profit >= 0 ? "+" : "";

  // Render HTML
  let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="text-align:left;">
                <div style="font-size:10px; color:#888;">Total Invested</div>
                <div style="font-weight:bold; color:#ccc;">${formatMoney(Math.floor(totalCost))}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:10px; color:#888;">Unrealized P/L</div>
                <div style="font-weight:bold; font-size:14px; color:${color};">
                    ${sign}${formatMoney(Math.floor(profit))}
                    <span style="font-size:11px; margin-left:2px;">(${sign}${profitPercent.toFixed(2)}%)</span>
                </div>
            </div>
        </div>
    `;

  // Inject into the container we created in insert()
  $("#alfa-pl-display").html(html);
}

// --- SMART TRADING (SHARE BASED) ---
async function sellSmart(sym, shares) {
  let price = getPrice(sym);
  if (price <= 0) {
    alert("Price error.");
    return;
  }

  let confirmMsg = "";
  // Check for benefit lock
  if ($("#alfa-lock-toggle").is(":checked")) {
    let owned = getOwnedShares(sym);
    let future = getBenefitTier(sym, owned - shares);
    let current = getBenefitTier(sym, owned);
    if (future.tier < current.tier) {
      confirmMsg = `WARNING: Selling this will drop your Benefit Tier!\n\n`;
    }
  }

  let totalCash = formatMoney(shares * price);
  confirmMsg += `Sell ${shares.toLocaleString()} shares of ${sym} for approx ${totalCash}?`;

  if (confirm(confirmMsg)) {
    await postTrade(sym, shares, "sellShares", `Sold`);
    setTimeout(() => runAdvisorLogic(true), 1000);
  }
}

async function buySmart(sym, targetShares) {
  let money = await syncWallet(true);
  let price = getPrice(sym);
  if (price <= 0) {
    alert("Price error.");
    return;
  }

  // Calculate max we can actually afford
  let maxAffordable = Math.floor(money / price);
  let sharesToBuy = Math.min(maxAffordable, targetShares);

  if (sharesToBuy <= 0) {
    alert("Not enough cash!");
    return;
  }

  let totalCost = formatMoney(sharesToBuy * price);
  if (
    confirm(
      `Invest ${totalCost} to buy ${sharesToBuy.toLocaleString()} shares of ${sym}?`,
    )
  ) {
    await postTrade(sym, sharesToBuy, "buyShares", `Invested`);
    setTimeout(() => runAdvisorLogic(true), 1000);
  }
}

// --- STANDARD VAULT FUNCTIONS ---
async function vault() {
  let symb = localStorage.alfa_vault_target;
  if (!symb) {
    alert("Select a stock first!");
    return;
  }
  let money = $("#alfa-use-api").is(":checked")
    ? await syncWallet(false)
    : getMoneyFast();
  if (money === 0 && !$("#alfa-use-api").is(":checked"))
    money = await syncWallet(false);
  if (money === 0) return;
  let price = getPrice(symb);
  let amt = Math.floor(money / price);
  postTrade(symb, amt, "buyShares", `Vaulted ${formatMoney(amt * price)}`);
}

async function vaultExcept() {
  let symb = localStorage.alfa_vault_target;
  if (!symb) {
    alert("Select a stock first!");
    return;
  }
  let money = $("#alfa-use-api").is(":checked")
    ? await syncWallet(false)
    : getMoneyFast();
  if (money === 0 && !$("#alfa-use-api").is(":checked"))
    money = await syncWallet(false);
  if (money === 0) return;
  let keepAmt = parseTornNumber($("#keepval").val()) || 0;
  let available = money - keepAmt;
  if (available <= 0) {
    $("#responseStock").html("Not enough money!").css("color", "red");
    return;
  }
  let price = getPrice(symb);
  let amt = Math.floor(available / price);
  postTrade(
    symb,
    amt,
    "buyShares",
    `Vaulted ${formatMoney(amt * price)} (Kept ${$("#keepval").val()})`,
  );
}

function withdraw() {
  let symb = localStorage.alfa_vault_target;
  if (!symb) {
    alert("Select a stock first!");
    return;
  }
  let val = parseTornNumber($("#sellval").val());
  let price = getPrice(symb);
  let shares = Math.ceil(val / 0.999 / price);
  if ($("#alfa-lock-toggle").is(":checked")) {
    let owned = getOwnedShares(symb);
    if (owned === 0 && !confirm("Script reads 0 shares. Continue?")) return;
    let future = getBenefitTier(symb, owned - shares);
    let current = getBenefitTier(symb, owned);
    if (future.tier < current.tier) {
      $("#responseStock")
        .html(`Blocked: Need shares for benefit`)
        .css("color", "red");
      return;
    }
  }
  postTrade(symb, shares, "sellShares", `Withdrawn approx ${formatMoney(val)}`);
}

function withdrawAll() {
  let symb = localStorage.alfa_vault_target;
  if (!symb) {
    alert("Select a stock first!");
    return;
  }
  let owned = getOwnedShares(symb);
  if (owned <= 0) {
    $("#responseStock").html("You have no shares.").css("color", "red");
    return;
  }
  let sellAmt = owned;
  if ($("#alfa-lock-toggle").is(":checked")) {
    let data = STOCK_DATA[symb];
    if (data) {
      let keep =
        data.type === "P"
          ? owned >= data.base
            ? data.base
            : 0
          : Math.floor(owned / data.base) * data.base;
      sellAmt = owned - keep;
      if (sellAmt <= 0) {
        $("#responseStock").html(`Locked for benefit.`).css("color", "orange");
        return;
      }
    }
  }
  postTrade(symb, sellAmt, "sellShares", `Sold All Available`);
}

function postTrade(symb, amt, step, msg) {
  $.post(
    `https://www.torn.com/page.php?sid=StockMarket&step=${step}&rfcv=${getRFC()}`,
    { stockId: stockId[symb], amount: amt },
  ).done(function (r) {
    try {
      if (typeof r === "string") r = JSON.parse(r);
      if (r.success) {
        $("#responseStock")
          .html(`${msg} (${amt} shares)`)
          .css("color", "green");

        // 1. Update Shares Cache
        updateLocalCache(symb, step === "buyShares" ? amt : -amt);

        // 2. Update Money Cache Manually (Fixes "Not Updating" bug)
        if (lastNwCache) {
          let price = getPrice(symb);
          let transactionValue = amt * price;
          if (step === "sellShares") {
            lastNwCache.pureCash += transactionValue;
          } else {
            lastNwCache.pureCash -= transactionValue;
          }
        }

        // 3. Update Advisor immediately using cached data
        runAdvisorLogic(true);
      } else
        $("#responseStock")
          .html(r.text || "Failed")
          .css("color", "red");
    } catch (e) {
      $("#responseStock").html("Request Sent").css("color", "blue");
    }
  });
  $("#responseStock").html("Processing...").css("color", "orange");
}

function renderPresets() {
  let isRR = localStorage.getItem("alfa_vault_rrbets") === "true";
  let presets = [];

  if (isRR) {
    try {
      let rrBets = JSON.parse(localStorage.getItem("rr_exported_bets"));
      if (rrBets && Array.isArray(rrBets)) {
        // Pull ALL active bets (ignoring empty $0 slots) and add $1,000 to each
        presets = rrBets.map((b) => (b || 0) + 1000);
      }
    } catch (e) {}

    // Safety fallback just in case RR Tracker hasn't saved yet
    if (presets.length === 0)
      presets = [101000, 201000, 401000, 801000, 1601000, 3201000];
  } else {
    presets =
      JSON.parse(localStorage.getItem("alfa_vault_presets")) || DEFAULT_PRESETS;
  }

  let html = "";
  presets.forEach((p) => {
    // Format it to K/M/B so the buttons stay small and clean
    let display = typeof p === "number" ? formatNumberToKMB(p) : p;
    html += `<button class="torn-btn alfa-preset-btn" data-amt="${p}">${display}</button>`;
  });
  $("#alfa-preset-row").html(html);

  $(".alfa-preset-btn").on("click", function (e) {
    e.preventDefault();
    let v = parseTornNumber($(this).attr("data-amt").toString());
    $("#sellval").val(v).attr("value", v);
    localStorage.setItem("alfa_vault_sellVal", v);
    if ($("#alfa-instant-toggle").is(":checked")) withdraw();
  });

  // Hide the 'Edit Buttons' link if RR mode is overriding the buttons
  if (isRR) {
    $("#alfa-edit-trigger").hide();
  } else {
    $("#alfa-edit-trigger").show();
  }
}
function renderEditMode() {
  let presets =
    JSON.parse(localStorage.getItem("alfa_vault_presets")) || DEFAULT_PRESETS;
  $("#alfa-preset-row").html(
    `<div class="alfa-edit-ui"><input type="text" id="alfa-preset-input" class="alfa-input" style="width:100%" value="${presets.join(", ")}"><div class="alfa-edit-actions"><button id="savep" class="alfa-action-btn alfa-save">Save</button><button id="canp" class="alfa-action-btn alfa-cancel">Cancel</button></div></div>`,
  );
  $("#alfa-edit-trigger").hide();
  $("#savep").click(() => {
    localStorage.setItem(
      "alfa_vault_presets",
      JSON.stringify(
        $("#alfa-preset-input")
          .val()
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
      ),
    );
    renderPresets();
    $("#alfa-edit-trigger").show();
  });
  $("#canp").click(() => {
    renderPresets();
    $("#alfa-edit-trigger").show();
  });
}

function openCostSettings() {
  // 1. Load Data
  let costs;
  try {
    costs = JSON.parse(localStorage.getItem("alfa_advisor_costs"));
  } catch (e) {}
  if (!costs) costs = {};
  // Ensure basics exist
  if (costs.refill_energy === undefined) costs.refill_energy = false;
  if (costs.refill_nerve === undefined) costs.refill_nerve = false;
  if (costs.refill_token === undefined) costs.refill_token = false;
  if (!costs.duke_weekly) costs.duke_weekly = 0;
  if (!costs.rehab_daily) costs.rehab_daily = 0;
  if (!costs.xanax) costs.xanax = 0;
  if (!costs.fhc) costs.fhc = 0;

  // --- Card 1: Consumables (Split by Type) ---
  const CAN_IDS = [530, 532, 533, 553, 554, 555, 985, 986, 987];

  let canRows = "";
  CAN_IDS.forEach((id) => {
    let name = ADVISOR_ITEMS[id] || `Can #${id}`;
    let val = costs[`can_${id}`] || 0;
    canRows += `<tr><td style="font-size:11px;">${name}</td><td><input class="alfa-tbl-input cost-input cost-can-input" data-id="${id}" type="number" value="${val}" placeholder="0"></td></tr>`;
  });

  let cardConsumables = `
    <div class="alfa-card">
        <div class="alfa-card-head"><span class="alfa-card-title">Daily Consumables (Qty)</span></div>
        <div style="padding:10px;">
            <table class="alfa-table">
                <tr><td style="font-weight:bold; color:#eebb44;">Xanax</td><td><input id="cost-xanax" type="number" class="alfa-tbl-input cost-input" value="${costs.xanax}" placeholder="0"></td></tr>
                <tr><td style="font-weight:bold; color:#eebb44;">FHC</td><td><input id="cost-fhc" type="number" class="alfa-tbl-input cost-input" value="${costs.fhc}" placeholder="0"></td></tr>
            </table>
            <div style="border-top:1px dashed #444; margin:8px 0;"></div>
            <div style="max-height:120px; overflow-y:auto;">
                <table class="alfa-table">
                    ${canRows}
                </table>
            </div>
        </div>
    </div>`;

  // --- Card 2: Refills ---
  let cardRefills = `
    <div class="alfa-card">
        <div class="alfa-card-head"><span class="alfa-card-title">Point Refills (30 Pts)</span></div>
        <div class="alfa-check-list" style="padding:12px; height:auto; display:flex; flex-direction:column; gap:8px;">
            <label class="alfa-check-label"><input type="checkbox" id="cost-refill-e" class="cost-input" ${costs.refill_energy ? "checked" : ""}> Energy Refill</label>
            <label class="alfa-check-label"><input type="checkbox" id="cost-refill-n" class="cost-input" ${costs.refill_nerve ? "checked" : ""}> Nerve Refill</label>
            <label class="alfa-check-label"><input type="checkbox" id="cost-refill-t" class="cost-input" ${costs.refill_token ? "checked" : ""}> Token Refill</label>
        </div>
    </div>`;

  // --- Card 3: Fees ---
  let cardFees = `
    <div class="alfa-card" style="grid-column: span 2;">
        <div class="alfa-card-head"><span class="alfa-card-title">Recurring Fees</span></div>
        <div style="padding:10px;">
            <table class="alfa-table">
                <tr><td>Duke Loan (Weekly)</td><td><input id="cost-duke" type="text" class="alfa-tbl-input cost-input" value="${formatMoney(costs.duke_weekly)}" placeholder="$0"></td></tr>
                <tr><td>Rehab Bill (Daily)</td><td><input id="cost-rehab" type="text" class="alfa-tbl-input cost-input" value="${formatMoney(costs.rehab_daily)}" placeholder="$0"></td></tr>
            </table>
        </div>
    </div>`;

  let html = `
    <div class="alfa-settings-grid" style="grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
        ${cardConsumables}
        ${cardRefills}
        ${cardFees}
    </div>
    <div style="display:flex; gap:10px;">
        <button id="alfa-back-costs" class="alfa-btn-main" style="background:#444;">Back</button>
        <button id="alfa-close-costs" class="alfa-btn-main" style="border-color:#609b9b; color:#609b9b;">Done</button>
    </div>`;

  createModal("Daily Cost Settings", html);

  // --- LOGIC: AUTO-SAVE & REFRESH ---
  const saveAndRefresh = () => {
    // FIX: Clean '$' and ',' from text inputs before parsing
    let rawDuke = $("#cost-duke").val().replace(/[$,]/g, "");
    let rawRehab = $("#cost-rehab").val().replace(/[$,]/g, "");

    let newCosts = {
      xanax: parseFloat($("#cost-xanax").val()) || 0,
      fhc: parseFloat($("#cost-fhc").val()) || 0,
      refill_energy: $("#cost-refill-e").is(":checked"),
      refill_nerve: $("#cost-refill-n").is(":checked"),
      refill_token: $("#cost-refill-t").is(":checked"),
      duke_weekly: parseTornNumber(rawDuke),
      rehab_daily: parseTornNumber(rawRehab),
    };

    // Collect specific can counts
    $(".cost-can-input").each(function () {
      let id = $(this).data("id");
      newCosts[`can_${id}`] = parseFloat($(this).val()) || 0;
    });

    localStorage.setItem("alfa_advisor_costs", JSON.stringify(newCosts));

    // Trigger Advisor Refresh (Live Update)
    runAdvisorLogic(true);
  };

  // Listen for ANY change in inputs
  $(".cost-input").on("change keyup click", saveAndRefresh);

  // Close/Back Buttons
  $("#alfa-close-costs, #alfa-back-costs").on("click", function () {
    $("#alfa-modal-overlay").remove();
    openAdvisorMain();
  });
}

function openItemSettings() {
  // 1. Define Categories
  // IDs for Cans (530-987), Xanax (206), FHC (367)
  const CONSUMABLE_IDS = [
    206, 367, 530, 532, 533, 553, 554, 555, 985, 986, 987,
  ];

  // 2. Build Rows for Each Section
  let generalRows = `
        <tr><td style="color:#8bc34a; font-weight:bold;">Points</td><td><input id="item-input-points" class="alfa-tbl-input" value="${(itemPrices["points"] || 0).toLocaleString("en-US")}"></td></tr>
        <tr><td style="color:#609b9b; font-weight:bold;">HRG Avg</td><td><input id="item-input-HRG_AVG" class="alfa-tbl-input" value="${(itemPrices["HRG_AVG"] || 0).toLocaleString("en-US")}"></td></tr>
    `;

  let consumableRows = "";
  let stockRows = "";

  // Sort items alphabetically for cleaner display within categories
  let sortedIds = Object.keys(ADVISOR_ITEMS).sort((a, b) =>
    ADVISOR_ITEMS[a].localeCompare(ADVISOR_ITEMS[b]),
  );

  for (let id of sortedIds) {
    let name = ADVISOR_ITEMS[id];
    let price = (itemPrices[id] || 0).toLocaleString("en-US");
    let rowHtml = `<tr><td>${name}</td><td><input class="alfa-tbl-input item-price-input" data-id="${id}" value="${price}"></td></tr>`;

    if (CONSUMABLE_IDS.includes(parseInt(id))) {
      consumableRows += rowHtml;
    } else {
      stockRows += rowHtml;
    }
  }

  // 3. Construct the HTML Structure
  let html = `
    <button id="adv-fetch-api" class="alfa-btn-main" style="width:100%; margin-bottom:10px; background:#2a4040; border-color:#609b9b;">Fetch Current Market Prices (API)</button>

    <div style="height:400px; overflow-y:auto; border-top:1px solid #333; border-bottom:1px solid #333; padding-right:5px;">

        <div class="alfa-section-header" style="background:#222; padding:5px 8px; font-weight:bold; color:#ccc; border-bottom:1px solid #444; margin-top:0;">General Values</div>
        <table class="alfa-table" style="margin-bottom:10px;">${generalRows}</table>

        <div class="alfa-section-header" style="background:#222; padding:5px 8px; font-weight:bold; color:#ccc; border-bottom:1px solid #444;">Consumables (Daily Cost)</div>
        <table class="alfa-table" style="margin-bottom:10px;">${consumableRows}</table>

        <div class="alfa-section-header" style="background:#222; padding:5px 8px; font-weight:bold; color:#ccc; border-bottom:1px solid #444;">Stock Dividends (Income)</div>
        <table class="alfa-table">${stockRows}</table>

    </div>

    <div id="adv-fetch-status" style="text-align:center; font-size:10px; margin:8px 0; color:#888;"></div>
    <button id="adv-back-items" class="alfa-btn-main" style="width:100%; background:#444;">Back</button>`;

  createModal("Item Values", html);

  // --- AUTO-SAVE LOGIC ---
  const autoSaveItems = () => {
    itemPrices["points"] = parseTornNumber($("#item-input-points").val());
    itemPrices["HRG_AVG"] = parseTornNumber($("#item-input-HRG_AVG").val());
    $(".item-price-input").each(function () {
      itemPrices[$(this).data("id")] = parseTornNumber($(this).val());
    });
    localStorage.setItem("alfa_advisor_prices", JSON.stringify(itemPrices));
  };

  $(".alfa-modal-body").on("keyup change", "input", autoSaveItems);
  $("#adv-back-items").click(() => {
    $("#alfa-modal-overlay").remove();
    openAdvisorMain();
  });
  $("#adv-fetch-api").click(fetchMarketPrices);
}
async function fetchMarketPrices() {
  let key = localStorage.getItem("alfa_vault_apikey");
  if (!key) return;
  $("#adv-fetch-status").text("Fetching...");
  try {
    let r = await fetch(
      `https://api.torn.com/market/?selections=pointsmarket&key=${key}`,
    );
    let d = await r.json();
    if (d.pointsmarket) {
      let v = Object.values(d.pointsmarket).sort((a, b) => a.cost - b.cost)[0]
        .cost;
      // FIX: Force US locale (commas)
      $("#item-input-points").val(v.toLocaleString("en-US")).trigger("change");
    }
    for (let id of Object.keys(ADVISOR_ITEMS)) {
      let r2 = await fetch(
        `https://api.torn.com/v2/torn/${id}/items?sort=ASC&key=${key}`,
      );
      let d2 = await r2.json();
      let p = 0;
      if (d2.value) p = d2.value.market_price;
      else if (d2.items && d2.items[0]) p = d2.items[0].value.market_price;

      // FIX: Force US locale (commas)
      if (p > 0)
        $(`.item-price-input[data-id="${id}"]`)
          .val(p.toLocaleString("en-US"))
          .trigger("change");

      await new Promise((r) => setTimeout(r, 100));
    }
    $("#adv-fetch-status").text("Done!");
  } catch (e) {
    $("#adv-fetch-status").text("Error");
  }
}

async function fetchBankRates() {
  let key = localStorage.getItem("alfa_vault_apikey");
  if (!key) {
    alert("API Key missing");
    return;
  }

  $("#adv-fetch-bank").text("Fetching...");

  try {
    const resRates = await fetch(
      `https://api.torn.com/v2/torn?selections=bank&key=${key}`,
    );
    const dataRates = await resRates.json();
    const resPerks = await fetch(
      `https://api.torn.com/user/?selections=perks&key=${key}`,
    );
    const dataPerks = await resPerks.json();

    if (dataRates.error) throw new Error(dataRates.error.error);

    const parseInterest = (list) => {
      if (!list || !Array.isArray(list)) return 0;
      let bonus = 0;
      list.forEach((str) => {
        if (str.toLowerCase().includes("bank interest")) {
          let match = str.match(/(\d+(?:\.\d+)?)%/);
          if (match) bonus += parseFloat(match[1]);
        }
      });
      return bonus;
    };

    let totalBonus = 0;
    totalBonus += parseInterest(dataPerks.merit_perks);
    totalBonus += parseInterest(dataPerks.faction_perks);
    totalBonus += parseInterest(dataPerks.job_perks);
    totalBonus += parseInterest(dataPerks.property_perks);
    totalBonus += parseInterest(dataPerks.stock_perks);
    totalBonus += parseInterest(dataPerks.education_perks);
    totalBonus += parseInterest(dataPerks.book_perks);

    let multi = 1 + totalBonus / 100;
    let bankData = dataRates.bank;

    if (bankData) {
      ["1w", "2w", "1m", "2m", "3m"].forEach((term) => {
        if (bankData[term]) {
          let baseApr = parseFloat(bankData[term]);
          let finalApr = baseApr * multi;
          // FIX: Trigger change so auto-save works
          $(`#bank-${term}`).val(finalApr.toFixed(2)).trigger("change");
        }
      });
      $("#adv-fetch-bank").text("Updated!");
    } else {
      $("#adv-fetch-bank").text("No Data");
    }
  } catch (e) {
    console.error("Bank Fetch Error:", e);
    $("#adv-fetch-bank").text("Error");
  }
  setTimeout(() => $("#adv-fetch-bank").text("Fetch Rates (API)"), 2000);
}

async function openTradeAssistant() {
  let html = `
        <div id="assistant-container">
            <div class="alfa-tabs" style="display:flex; gap:5px; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px; align-items:center;">
                <button class="tab-btn active" data-filter="all">⚖️ All</button>
                <button class="tab-btn" data-filter="buy" style="color:#8bc34a;">📈 Buy</button>
                <button class="tab-btn" data-filter="sell" style="color:#ef5350;">📉 Sell</button>
                <button id="btn-analyze-now" class="alfa-mini-btn" style="margin-left:auto; border-color:#609b9b; color:#609b9b; height:28px;">Analyze Now</button>
            </div>
            <div id="progress-wrapper" style="background:#222; border-radius:10px; height:6px; margin-bottom:15px; overflow:hidden;">
                <div id="progress-fill" style="background:#8bc34a; width:0%; height:100%; transition: width 0.1s;"></div>
            </div>
            <div id="assistant-feed" style="max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:5px;"></div>
        </div>
    `;

  $(".alfa-modal-overlay").remove();
  createModal("Trade Assistant", html);

  const symbols = Object.keys(STOCK_DATA);
  const results = [];
  const now = Date.now();

  const finalizeAnalysis = () => {
    results.sort((a, b) => b.analysis.score - a.analysis.score);
    renderTradeList(results); // Ensure renderTradeList uses .empty()
    $("#progress-wrapper").hide();

    // Tab Filtering Logic
    $(".tab-btn")
      .off("click")
      .on("click", function () {
        $(".tab-btn").removeClass("active");
        $(this).addClass("active");
        const filter = $(this).data("filter");
        if (filter === "all") $(".stock-card").show();
        else {
          $(".stock-card").hide();
          $(`.stock-card[data-type='${filter}']`).show();
        }
      });

    // Analyze Now Logic (Atomic Clear)
    $("#btn-analyze-now")
      .off("click")
      .on("click", function () {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("alfa_cache_")) localStorage.removeItem(key);
        });
        openTradeAssistant();
      });
  };

  for (let i = 0; i < symbols.length; i++) {
    let sym = symbols[i];
    let stockKey = `alfa_cache_${sym}`;
    let history;

    // 1. ATOMIC CACHE CHECK
    let cachedItem = localStorage.getItem(stockKey);
    let parsed = cachedItem ? JSON.parse(cachedItem) : null;

    if (parsed && now - parsed.timestamp < 3600000) {
      history = parsed.data;
    } else {
      try {
        const rawData = await fetchStockHistory(sym, "h1");
        // Slim data to bypass 5MB limit: [null, null, null, null, Price, Volume]
        history = rawData.map((h) => [0, 0, 0, 0, h[4], h[5]]);

        // 2. ATOMIC SAVE (One stock at a time)
        localStorage.setItem(
          stockKey,
          JSON.stringify({
            data: history,
            timestamp: now,
          }),
        );
      } catch (e) {
        console.warn(`Storage quota nearly full for ${sym}`);
        // If it's the last one, we still need to render
        if (i === symbols.length - 1) finalizeAnalysis();
        continue;
      }
    }

    // 3. ANALYSIS
    const prices = history.map((h) => parseFloat(h[4]));
    const volumes = history.map((h) => parseInt(h[5]) || 0);
    const currentVol = volumes[volumes.length - 1];
    const avgVol = volumes.slice(-24).reduce((a, b) => a + b, 0) / 24;

    const analysis = getTradeScore(prices);
    results.push({
      sym,
      history,
      analysis: {
        ...analysis,
        volSpike: currentVol > avgVol * 2,
        currentVol,
      },
    });

    // Update Progress
    $("#progress-fill").css("width", ((i + 1) / symbols.length) * 100 + "%");

    // 4. FINAL TRIGGER
    if (i === symbols.length - 1) {
      setTimeout(finalizeAnalysis, 300);
    }
  }
}

function renderTradeList(dataList) {
  $("#assistant-feed").empty();

  let feedHtml = "";

  dataList.forEach((item) => {
    // 1. Data Extraction
    const analysis = item.analysis;
    const history = item.history;
    const currentPrice = parseFloat(history[history.length - 1][4]);
    const price24hAgo = parseFloat(history[history.length - 24][4]);

    // 2. Visual Logic (Colors & Icons)
    const type =
      analysis.score > 0 ? "buy" : analysis.score < 0 ? "sell" : "hold";
    const color =
      type === "buy" ? "#8bc34a" : type === "sell" ? "#ef5350" : "#666";
    const trendIcon = analysis.prediction > 0 ? "▲" : "▼";

    // 3. EMA Cross Detection (✨ logic)
    // We look back 6 hours to see if a cross recently occurred
    const histPrices = history.slice(0, -6).map((h) => parseFloat(h[4]));
    const oldEma20 = calculateEMA(histPrices.slice(-20), 20);
    const oldEma90 = calculateEMA(histPrices.slice(-90), 90);
    const isGoldenCross =
      analysis.ema20 > analysis.ema90 && oldEma20 <= oldEma90;

    // 4. Volume Spike Indicator (📊 logic)
    const volIcon = analysis.volSpike
      ? `<span style="color:#00e5ff; font-size:12px; margin-left:3px;" title="Volume Spike Detected">📊</span>`
      : "";

    // 5. Construct the Card HTML
    feedHtml += `
            <div class="stock-card" data-sym="${item.sym}" data-type="${type}" style="border-left: 4px solid ${color}; padding: 10px; margin-bottom: 5px; background: #1a1a1a; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-radius: 4px; transition: background 0.2s;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-weight: bold; color: #fff; font-size: 14px;">${item.sym}</span>
                        ${isGoldenCross ? '<span style="color: #ffeb3b; font-size: 12px;" title="Recent Bullish Cross">✨</span>' : ""}
                        ${volIcon}
                    </div>
                    <span style="font-size: 11px; color: ${color}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${trendIcon} ${analysis.label}
                    </span>
                </div>

                <div style="text-align: right; display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 13px; color: #fff; font-weight: bold;">
                        Target: +${analysis.prediction}%
                    </div>
                    <div style="font-size: 10px; color: ${currentPrice >= price24hAgo ? "#8bc34a" : "#ef5350"}; font-weight: 500;">
                        24h: ${(((currentPrice - price24hAgo) / price24hAgo) * 100).toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
  });

  // 6. Injection & Error Handling
  const container = $("#assistant-feed");
  if (feedHtml === "") {
    container.html(
      '<div style="text-align:center; padding:30px; color:#888; font-style:italic;">No signals matching this category.</div>',
    );
  } else {
    container.html(feedHtml);
  }

  // 7. Event Delegation (Opens the Command Center)
  // We use .off().on() to prevent multiple event listeners stacking on PDA
  $(".stock-card")
    .off("click")
    .on("click", function () {
      const sym = $(this).data("sym");
      const stockData = dataList.find((d) => d.sym === sym);
      if (stockData) {
        openBigCard(sym, stockData.history);
      }
    });
}

function fetchStockHistory(symbol, interval = "h1") {
  // Ensure symbol is Uppercase (Tornsy prefers this)
  const sym = symbol.toUpperCase();
  console.log(`Fetching data for ${sym}...`);

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      // We use a clean URL without extra spaces or weird characters
      url: `https://tornsy.com/api/${sym}?interval=${interval}&limit=720`,
      onload: function (response) {
        if (response.status === 200) {
          try {
            const data = JSON.parse(response.responseText);
            // Check if the server actually gave us data
            if (data && data.data) {
              resolve(data.data);
            } else {
              reject("Empty Data");
            }
          } catch (e) {
            reject("JSON Parse Error");
          }
        } else {
          console.error(`Error ${response.status}: ${response.responseText}`);
          reject(`Error ${response.status}`);
        }
      },
      onerror: (err) => reject("Network Error"),
    });
  });
}

function openBigCard(sym, history) {
  const prices = history.map((h) => parseFloat(h[4]));
  const analysis = getTradeScore(prices);
  const currentPrice = prices[prices.length - 1];

  // Get user-specific data
  const sId = stockId[sym];
  const owned = getOwnedShares(sym);

  let detailHtml = `
        <div id="big-card-content" style="display:flex; flex-direction:column; gap:12px;">
            <div class="timeframe-bar" style="display:flex; justify-content:center; gap:8px; margin-bottom:5px;">
                <button class="tf-btn" data-hours="24">24H</button>
                <button class="tf-btn" data-hours="168">1W</button>
                <button class="tf-btn active" data-hours="720">1M</button>
            </div>

            <div style="background:#000; padding:10px; border-radius:8px; border:1px solid #333; position:relative;">
                <div style="display:flex; justify-content:center; gap:12px; font-size:9px; margin-bottom:8px; border-bottom:1px solid #222; padding-bottom:5px;">
                    <span style="color:#8bc34a;">● Price</span>
                    <span style="color:#ffeb3b;">— EMA 20</span>
                    <span style="color:#ff8c00;">— EMA 90</span>
                    <span style="color:rgba(0, 229, 255, 0.6);">■ Volume</span>
                </div>
                <canvas id="big-chart-canvas" width="400" height="180" style="width:100%; height:180px;"></canvas>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div class="alfa-card" style="padding:10px; background:#1e1e1e; border-radius:6px;">
                    <div style="font-size:9px; color:#888;">MOMENTUM (RSI)</div>
                    <div style="font-size:16px; color:${analysis.rsi > 70 ? "#ef5350" : analysis.rsi < 30 ? "#8bc34a" : "#fff"}">
                        ${analysis.rsi.toFixed(2)}
                    </div>
                </div>
                <div class="alfa-card" style="padding:10px; background:#1e1e1e; border-radius:6px;">
                    <div style="font-size:9px; color:#888;">24H CHANGE</div>
                    <div style="font-size:16px; color:${prices[prices.length - 1] > prices[prices.length - 24] ? "#8bc34a" : "#ef5350"}">
                        ${(((prices[prices.length - 1] - prices[prices.length - 24]) / prices[prices.length - 24]) * 100).toFixed(2)}%
                    </div>
                </div>
                <div class="alfa-card" style="padding:10px; background:#1e1e1e; border-radius:6px;">
                    <div style="font-size:9px; color:#888;">PREDICTED MOVE</div>
                    <div style="font-size:16px; color:#8bc34a; font-weight:bold;">+${analysis.prediction}%</div>
                </div>
                <div class="alfa-card" style="padding:10px; background:#1e1e1e; border-radius:6px;">
                    <div style="font-size:9px; color:#888;">30D HIGH</div>
                    <div style="font-size:16px;">${formatMoney(Math.max(...prices))}</div>
                </div>
            </div>

            <div style="background:#222; padding:15px; border-radius:8px; border:1px solid #444;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:12px;">
                    <span style="color:#aaa;">Owned: <strong id="owned-display" style="color:#fff;">${owned.toLocaleString()}</strong></span>
                    <span style="color:#aaa;">Price: <strong style="color:#fff;">${formatMoney(currentPrice)}</strong></span>
                </div>

                <div style="display:flex; gap:10px;">
                    <input type="text" id="trade-amount" class="alfa-input" placeholder="$ Amount (e.g. 10m)" style="flex:1; height:34px; background:#111; color:#fff; border:1px solid #444; padding:0 10px; border-radius:4px;">
                    <button id="btn-buy-now" class="alfa-main-btn" style="border-color:#8bc34a; color:#8bc34a; min-width:60px;">BUY</button>
                    <button id="btn-sell-now" class="alfa-main-btn" style="border-color:#ef5350; color:#ef5350; min-width:60px;">SELL</button>
                </div>
                <div id="trade-status" style="font-size:11px; margin-top:10px; text-align:center; min-height:14px;"></div>
            </div>
        </div>
    `;

  // Initialize Modal
  createModal(`${sym} Command Center`, detailHtml);

  // Initial Chart Draw (Default 1M)
  setTimeout(() => {
    drawAnalyticChart("big-chart-canvas", history);
  }, 150);

  // --- TIMEFRAME CLICK LOGIC ---
  $(".tf-btn").on("click", function () {
    $(".tf-btn").removeClass("active");
    $(this).addClass("active");

    const hours = parseInt($(this).data("hours"));

    // We pass the FULL history so it can calculate the Global EMAs,
    // but we pass 'hours' so it knows how many price points to actually draw.
    drawAnalyticChart("big-chart-canvas", history, hours);
  });

  // --- TRADE BUTTON LOGIC ---
  $("#btn-buy-now").on("click", () => tradeFromAssistant(sym, "buy"));
  $("#btn-sell-now").on("click", () => tradeFromAssistant(sym, "sell"));
}

function drawAnalyticChart(canvasId, fullHistory, viewHours = 720) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // A. DATA PREP
  const allPrices = fullHistory.map((h) => parseFloat(h[4]));
  const viewPrices = allPrices.slice(-viewHours);
  const viewVolumes = fullHistory
    .map((h) => parseInt(h[5]) || 0)
    .slice(-viewHours);

  const width = canvas.width;
  const height = canvas.height;

  // B. CALCULATE GLOBAL EMAs (at the specific point in time)
  const ema20Points = [];
  const ema90Points = [];

  // We loop through the entire month to get the accurate EMA values
  for (let i = 0; i < allPrices.length; i++) {
    if (i >= 20) ema20Points.push(calculateEMA(allPrices.slice(0, i + 1), 20));
    if (i >= 90) ema90Points.push(calculateEMA(allPrices.slice(0, i + 1), 90));
  }

  // C. GET THE VIEWABLE SLICE OF EMAs
  const viewEma20 = ema20Points.slice(-viewHours);
  const viewEma90 = ema90Points.slice(-viewHours);

  // D. ABSOLUTE SCALE (The "Master List")
  // We find the High/Low of the Price, EMA20, and EMA90 ONLY for the viewable window
  const allVisible = [...viewPrices, ...viewEma20, ...viewEma90];
  const absMin = Math.min(...allVisible);
  const absMax = Math.max(...allVisible);

  const padding = (absMax - absMin) * 0.12; // 12% padding for clear view
  const minScale = absMin - padding;
  const maxScale = absMax + padding;
  const range = maxScale - minScale;

  const getY = (val) =>
    height * 0.8 - ((val - minScale) / (range || 1)) * (height * 0.8);

  ctx.clearRect(0, 0, width, height);

  // E. DRAW VOLUME (Bottom 20%)
  const maxVol = Math.max(...viewVolumes);
  ctx.fillStyle = "rgba(0, 229, 255, 0.2)";
  viewVolumes.forEach((v, i) => {
    const x = (i / (viewHours - 1)) * width;
    const barH = (v / (maxVol || 1)) * (height * 0.15);
    ctx.fillRect(x, height - barH, (width / viewHours) * 0.8, barH);
  });

  // F. DRAW GLOBAL EMA 90 (Orange)
  ctx.strokeStyle = "rgba(255, 140, 0, 0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  viewEma90.forEach((val, i) => {
    const x = (i / (viewHours - 1)) * width;
    if (i === 0) ctx.moveTo(x, getY(val));
    else ctx.lineTo(x, getY(val));
  });
  ctx.stroke();

  // G. DRAW GLOBAL EMA 20 (Yellow)
  ctx.strokeStyle = "rgba(255, 235, 59, 0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  viewEma20.forEach((val, i) => {
    const x = (i / (viewHours - 1)) * width;
    if (i === 0) ctx.moveTo(x, getY(val));
    else ctx.lineTo(x, getY(val));
  });
  ctx.stroke();

  // H. DRAW PRICE (Green)
  ctx.strokeStyle = "#8bc34a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  viewPrices.forEach((p, i) => {
    const x = (i / (viewHours - 1)) * width;
    if (i === 0) ctx.moveTo(x, getY(p));
    else ctx.lineTo(x, getY(p));
  });
  ctx.stroke();
}

async function tradeFromAssistant(sym, type) {
  const amountInput = $("#trade-amount").val();
  const amount = parseTornNumber(amountInput);

  if (!amount || amount <= 0) {
    $("#trade-status").text("❌ Enter a valid amount").css("color", "#ef5350");
    return;
  }

  const price = getPrice(sym);
  const shares =
    type === "buy" ? Math.floor(amount / price) : Math.ceil(amount / price);
  const step = type === "buy" ? "buyShares" : "sellShares";

  $("#trade-status")
    .text(`⏳ ${type === "buy" ? "Buying" : "Selling"}...`)
    .css("color", "#ffeb3b");

  try {
    // Calling your original postTrade function
    await postTrade(
      sym,
      shares,
      step,
      `${type === "buy" ? "Bought" : "Sold"} ${shares.toLocaleString()} shares of ${sym}`,
    );

    // SUCCESS UPDATE
    $("#trade-status")
      .html(
        `✅ Successfully ${type === "buy" ? "bought" : "sold"} ${shares.toLocaleString()} shares!`,
      )
      .css("color", "#8bc34a");
    $("#trade-amount").val(""); // Clear input

    // Refresh the 'Owned' display in the Big Card
    const newOwned = getOwnedShares(sym);
    $(".alfa-modal strong:first").text(newOwned.toLocaleString());
  } catch (e) {
    $("#trade-status")
      .text("❌ Error processing trade")
      .css("color", "#ef5350");
  }
}

// 1. RSI (Relative Strength Index)
// Tells us if people are over-buying (Red zone) or over-selling (Green zone)
function calculateRSI(prices, period = 14) {
  let gains = 0,
    losses = 0;
  // We look at the differences between closing prices
  for (let i = prices.length - period; i < prices.length; i++) {
    let diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let rs = gains / period / (losses / period);
  return 100 - 100 / (1 + rs);
}

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices[0]; // Start with the first price
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// 2. Bollinger Bands
// Tells us if the price is "too high" or "too low" compared to its recent average
function calculateBollinger(prices, period = 20) {
  const slice = prices.slice(-period);
  const avg = slice.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(
    slice.map((x) => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / period,
  );
  const upper = avg + stdDev * 2;
  const lower = avg - stdDev * 2;
  const currentPrice = prices[prices.length - 1];

  return {
    upper,
    lower,
    // Position: 0 means at the bottom band (Buy), 1 means at the top (Sell)
    position: (currentPrice - lower) / (upper - lower),
  };
}

function getTradeScore(prices) {
  let score = 0;
  let signals = [];
  const currentPrice = prices[prices.length - 1];

  // 1. ANALYTIC TOOLS
  const rsi = calculateRSI(prices);
  const bb = calculateBollinger(prices);
  const ema20 = calculateEMA(prices.slice(-20), 20);
  const ema90 = calculateEMA(prices.slice(-90), 90);
  const monthlySMA = prices.reduce((a, b) => a + b, 0) / prices.length;

  // 2. MOMENTUM SCORING (RSI)
  if (rsi < 30) {
    score += 40;
    signals.push("Oversold (RSI)");
  } else if (rsi > 70) {
    score -= 40;
    signals.push("Overbought (RSI)");
  }

  // 3. RANGE SCORING (Bollinger Bands)
  if (bb.position < 0.1) {
    score += 40;
    signals.push("Bottom of Range");
  } else if (bb.position > 0.9) {
    score -= 40;
    signals.push("Top of Range");
  }

  // 4. TREND SCORING (EMA Crossovers)
  if (ema20 > ema90) {
    score += 25;
    signals.push("Bullish Trend (20/90)");
  } else {
    score -= 25;
    signals.push("Bearish Trend (20/90)");
  }

  // 5. VALUE SCORING (Monthly Average)
  if (currentPrice < monthlySMA) {
    score += 15;
    signals.push("Below Monthly Avg");
  } else {
    score -= 10;
    signals.push("Above Monthly Avg");
  }

  // 6. DETERMINE LABEL
  let label = "Hold";
  if (score >= 80) label = "Strong Buy";
  else if (score >= 40) label = "Buy";
  else if (score <= -80) label = "Strong Sell";
  else if (score <= -40) label = "Sell";

  // 7. PREDICT PROFIT % (Targeting the Upper Bollinger Band)
  const targetPrice = bb.upper;
  const prediction = ((targetPrice - currentPrice) / currentPrice) * 100;

  return {
    score,
    label,
    signals,
    rsi,
    bb,
    ema20,
    ema90,
    sma: monthlySMA,
    prediction: prediction.toFixed(1),
  };
}

// --- UPDATED SETTINGS MENU (Merged Blocks) ---
function openNetworthSettings() {
  let s = networthSettings.sources;

  // 1. General Settings
  let generalHtml = `
    <div class="alfa-card">
        <div class="alfa-card-head"><span class="alfa-card-title">General Settings</span></div>
        <div style="padding:10px; display:flex; flex-direction:column; gap:10px;">
            <div>
                <div style="font-size:10px; color:#888; margin-bottom:5px; text-transform:uppercase; font-weight:bold;">Networth Sources</div>
                <div style="display:flex; gap:10px;">
                    <label style="font-size:11px; cursor:pointer;"><input type="checkbox" id="nw-src-inv" ${s.inventory ? "checked" : ""}> Inv</label>
                    <label style="font-size:11px; cursor:pointer;"><input type="checkbox" id="nw-src-pts" ${s.points ? "checked" : ""}> Points</label>
                    <label style="font-size:11px; cursor:pointer;"><input type="checkbox" id="nw-src-stocks" ${s.stocks ? "checked" : ""}> Stocks</label>
                </div>
            </div>
            <div style="border-top:1px dashed #444; margin:5px 0;"></div>
            <div>
                <div style="font-size:10px; color:#888; margin-bottom:5px; text-transform:uppercase; font-weight:bold;">Stock Value Logic</div>
                <select id="nw-exclude-mode" class="alfa-select" style="width:100%; margin-bottom:5px;">
                    <option value="all" ${networthSettings.excludeMode === "all" ? "selected" : ""}>Count Entire Value</option>
                    <option value="active" ${networthSettings.excludeMode === "active" ? "selected" : ""}>Exclude Active Blocks</option>
                </select>
                <div style="font-size:10px; color:#666; line-height:1.2;">"Exclude Active Blocks" removes value of completed tiers.</div>
            </div>
        </div>
    </div>`;

  // 2. Bank ROI Card
  let bankInputs = ["1w", "2w", "1m", "2m", "3m"]
    .map(
      (t) =>
        `<div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#aaa; font-weight:bold; width:25px;">${t}</span>
            <input id="bank-${t}" class="alfa-tbl-input" style="width:60px;" value="${bankSettings["roi_" + t] || 0}">
         </div>`,
    )
    .join("");

  let bankHtml = `
    <div class="alfa-card">
        <div class="alfa-card-head"><span class="alfa-card-title">Bank ROI % (APR)</span></div>
        <div style="padding:12px;">
            <div style="display:flex; flex-direction:column; gap:6px;">${bankInputs}</div>
            <button id="adv-fetch-bank" class="alfa-mini-btn" style="width:100%; margin:12px 0 0 0; padding:6px; border-color:#609b9b; color:#609b9b;">Fetch Rates (API)</button>
        </div>
    </div>`;

  // 3. Excluded Stocks
  let excludedHtml = `
    <div class="alfa-card" style="grid-column: span 2;">
        <div class="alfa-card-head"><span class="alfa-card-title">Manually Excluded Stocks</span></div>
        <div class="alfa-check-list" style="height:120px; display:grid; grid-template-columns: repeat(3, 1fr); gap:5px;">
            ${Object.keys(STOCK_DATA)
              .sort()
              .map(
                (sym) =>
                  `<label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" class="nw-exclude-stock" value="${sym}" ${networthSettings.excludedStocks.includes(sym) ? "checked" : ""}> ${sym}</label>`,
              )
              .join("")}
        </div>
    </div>`;

  let html = `
    <div class="alfa-settings-grid" style="grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
        ${generalHtml} ${bankHtml} ${excludedHtml}
    </div>
    <button id="adv-back-nw" class="alfa-btn-main" style="width:100%; padding:10px; background:#444;">Back</button>`;

  createModal("Networth Settings", html);

  // --- AUTO-SAVE LOGIC ---
  const autoSave = () => {
    // Update Networth Settings Object
    networthSettings.sources.inventory = $("#nw-src-inv").is(":checked");
    networthSettings.sources.points = $("#nw-src-pts").is(":checked");
    networthSettings.sources.stocks = $("#nw-src-stocks").is(":checked");
    networthSettings.excludeMode = $("#nw-exclude-mode").val();

    let ex = [];
    $(".nw-exclude-stock:checked").each(function () {
      ex.push($(this).val());
    });
    networthSettings.excludedStocks = ex;

    // Update Bank Settings Object
    ["1w", "2w", "1m", "2m", "3m"].forEach((t) => {
      bankSettings["roi_" + t] = parseFloat($(`#bank-${t}`).val()) || 0;
    });

    // Write to Storage
    localStorage.setItem(
      "alfa_advisor_networth",
      JSON.stringify(networthSettings),
    );
    localStorage.setItem("alfa_advisor_bank", JSON.stringify(bankSettings));
  };

  // Attach Listeners to everything
  $(".alfa-modal-body").on("change keyup", "input, select", autoSave);

  // Back Button
  $("#adv-back-nw").click(() => {
    $("#alfa-modal-overlay").remove();
    openAdvisorMain();
  });

  // Fetch Button
  $("#adv-fetch-bank").click(fetchBankRates);
}
insert();

//CSS
const style = `

.tf-btn {
    background: #222;
    border: 1px solid #444;
    color: #888;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s;
}
.tf-btn.active {
    background: #609b9b;
    color: #fff;
    border-color: #609b9b;
}
.tf-btn:hover {
    background: #333;
}

.tab-btn {
    flex: 1;
    background: #222;
    border: 1px solid #333;
    color: #888;
    padding: 6px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    font-weight: bold;
}
.tab-btn.active {
    background: #333;
    border-color: #609b9b;
    color: #fff;
}

/* Container and Scrollbar styling */
#assistant-feed {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 5px;
}

#assistant-feed::-webkit-scrollbar {
    width: 4px;
}

#assistant-feed::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 10px;
}

/* The Stock Card */
.stock-card {
    background: #1e1e1e;
    border: 1px solid #333;
    border-left: 4px solid #444;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 2px; /* Tighter spacing for better ordering */
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: transform 0.1s, background 0.2s;
}

/* Hover effect for PC users */
.stock-card:hover {
    background: #252525;
    transform: translateX(3px);
    border-color: #555;
}

/* Mobile specific: stack items if screen is narrow */
@media screen and (max-width: 480px) {
    .stock-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
    }
}
.alfa-card-head { cursor: pointer; user-select: none; } .alfa-card-head:hover .alfa-card-title { color: #fff; }
.alfa-card-details { display: none; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #444; font-size: 11px; color: #ccc; }
.alfa-detail-row { display: flex; justify-content: space-between; padding: 2px 0; }
.alfa-detail-sub { color: #888; padding-left: 8px; }
.alfa-detail-total { border-top: 1px solid #333; margin-top: 4px; padding-top: 4px; font-weight: bold; color: #8bc34a; }
.alfa-detail-miss { border-top: 1px solid #333; margin-top: 4px; padding-top: 4px; font-weight: bold; color: #ef5350; }
.alfa-hero { cursor: pointer; transition: background 0.2s; background: linear-gradient(135deg, #2a2a2a 0%, #222 100%); border: 1px solid #333; border-radius: 8px; padding: 20px; text-align: center; position: relative; }
.alfa-hero:hover { border-color: #609b9b; }
.alfa-breakdown { display: none; margin-top: 15px; border-top: 1px solid #444; padding-top: 10px; text-align: left; }
.alfa-break-row { display: flex; flex-direction: column; font-size: 11px; padding: 6px 0; border-bottom: 1px solid #222; color: #ccc; }
.alfa-break-row:last-child { border-bottom: none; }
.alfa-break-val { color: #8bc34a; font-weight: bold; }
.alfa-caret { float: right; transition: transform 0.3s; font-size: 10px; color: #666; }
.alfa-expanded .alfa-caret { transform: rotate(180deg); }
.alfa-header { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 10px; }
.alfa-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 5px; font-size: 11px; color: #888; }
.alfa-small-label { display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; } .alfa-small-label:hover { color: #fff; }
.alfa-advisor-btn { background: #2a4040; border: 1px solid #609b9b; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; text-decoration: none; }
.alfa-advisor-btn:hover { background: #609b9b; }
.alfa-container { background: #111; padding: 12px; border: 1px solid #333; border-radius: 8px; margin-bottom: 15px; color: #ccc; font-family: Arial, sans-serif; font-size: 12px; }
.alfa-row { margin-bottom: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.alfa-divider { border-top: 1px solid #333; padding-top: 10px; width: 100%; }
.alfa-group { display: flex; gap: 5px; flex-grow: 1; }
.alfa-label { width: 50px; font-weight: bold; color: #999; }
.alfa-input, .alfa-select { background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 4px 8px; height: 28px; box-sizing: border-box; }
.alfa-input { width: 130px; } .alfa-select { width: 150px; } .alfa-input:focus, .alfa-select:focus { border-color: #609b9b; outline: none; }
.alfa-link { cursor: pointer; color: #609b9b; text-decoration: underline; margin-left: auto; } .alfa-link:hover { color: #fff; }
.alfa-preset-row { display: flex; flex-wrap: wrap; gap: 5px; width: 100%; margin-top:5px; }
.alfa-preset-btn { padding: 3px 10px !important; font-size: 11px !important; height: 26px !important; line-height: 18px !important; background: #444 !important; border: 1px solid #555 !important; border-radius: 4px !important; color: #ddd !important; }
.alfa-preset-btn:hover { background: #555 !important; color: #fff !important; }
.alfa-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
.alfa-modal { background: #1e1e1e; width: 600px; max-width: 95%; border: 1px solid #333; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.9); display: flex; flex-direction: column; overflow: hidden; animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.alfa-modal-header { background: #252525; padding: 15px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
.alfa-modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #fff; letter-spacing: 0.5px; }
.alfa-modal-close { cursor: pointer; font-size: 24px; color: #666; transition: color 0.2s; } .alfa-modal-close:hover { color: #fff; }
.alfa-modal-body { padding: 20px; color: #ccc; overflow-y: auto; max-height: 80vh; }
.alfa-dashboard { display: flex; flex-direction: column; gap: 20px; }
.alfa-hero-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 5px; }
.alfa-hero-val { font-size: 28px; font-weight: 700; color: #8bc34a; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
.alfa-hero-sub { font-size: 12px; color: #666; margin-top: 5px; }
.alfa-grid-section { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.alfa-card { background: #252525; border: 1px solid #333; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; transition: transform 0.2s; } .alfa-card:hover { border-color: #444; transform: translateY(-2px); }
.alfa-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; }
.alfa-card-title { font-size: 11px; font-weight: bold; color: #aaa; text-transform: uppercase; }
.alfa-card-roi { font-size: 18px; font-weight: bold; color: #609b9b; }
.alfa-card-body { flex-grow: 1; display: flex; flex-direction: column; gap: 4px; }
.alfa-stock-name { font-size: 14px; font-weight: bold; color: #fff; }
.alfa-stock-cost { font-size: 12px; color: #888; }
.alfa-stock-gain { font-size: 12px; color: #8bc34a; margin-top: auto; padding-top: 10px; display: flex; align-items: center; gap: 5px; } .alfa-stock-gain::before { content: "▲"; font-size: 8px; margin-right: 4px; }
.alfa-actions { display: flex; gap: 10px; border-top: 1px solid #333; padding-top: 20px; margin-top: 10px; }
.alfa-btn-main { flex: 1; background: #333; color: #fff; border: 1px solid #444; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s; text-align: center; } .alfa-btn-main:hover { background: #444; border-color: #609b9b; }
.alfa-settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.alfa-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
.alfa-table th { text-align: left; padding: 8px; color: #888; border-bottom: 1px solid #444; }
.alfa-table td { padding: 8px; border-bottom: 1px solid #333; }
.alfa-check-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-height: 200px; overflow-y: auto; background: #151515; padding: 10px; border-radius: 6px; border: 1px solid #333; }
.alfa-check-label { display: flex; align-items: center; gap: 8px; color: #ccc; cursor: pointer; font-size: 11px; } .alfa-check-label:hover { color: #fff; }
.alfa-tbl-input { width: 100%; background: #222; border: 1px solid #444; color: #fff; padding: 4px; text-align: right; border-radius: 4px; box-sizing: border-box; }
.alfa-edit-ui { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.alfa-edit-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 5px; }
.alfa-action-btn { padding: 3px 12px !important; font-size: 11px !important; height: 24px !important; border-radius: 4px !important; font-weight: bold !important; background: transparent !important; cursor: pointer; }
.alfa-save { border: 1px solid #609b9b !important; color: #609b9b !important; } .alfa-save:hover { background: #609b9b !important; color: #111 !important; }
.alfa-cancel { border: 1px solid #d32f2f !important; color: #d32f2f !important; } .alfa-cancel:hover { background: #d32f2f !important; color: #fff !important; }
.alfa-shortage { color: #ef5350; font-weight: bold; }
.alfa-main-btn { background: #333; color: #ddd; border: 1px solid #555; border-radius: 4px; padding: 0 15px; height: 28px; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; } .alfa-main-btn:hover { background: #444; border-color: #609b9b; color: #fff; }
.alfa-mini-btn { background: transparent; border: 1px solid #ef5350; color: #ef5350; font-size: 9px; padding: 1px 6px; border-radius: 3px; cursor: pointer; margin-left: 8px; text-transform: uppercase; }
.alfa-mini-btn:hover { background: #ef5350; color: #fff; }
.alfa-invest-btn { width: 100%; background: #2a4040; border: 1px solid #609b9b; color: #fff; padding: 6px; margin-top: 8px; font-size: 11px; font-weight: bold; cursor: pointer; border-radius: 4px; }
.alfa-invest-btn:hover { background: #609b9b; }
/* --- DIAGNOSTIC TOOL CSS --- */
.sim-row { transition: background 0.2s; }
.sim-row:hover { background: rgba(255,255,255,0.05) !important; }
/* Ensure inputs in the modal look right */
.alfa-tbl-input { background: #111; border: 1px solid #444; color: #fff; padding: 4px; border-radius: 4px; }
/* --- CUSTOM BUTTON COLORS --- */
#vaultall { border-color: #66bb6a !important; color: #66bb6a !important; }
#vaultall:hover { background: #66bb6a !important; color: #111 !important; }

#vaultexcept { border-color: #26a69a !important; color: #26a69a !important; }
#vaultexcept:hover { background: #26a69a !important; color: #111 !important; }

#sellamt { border-color: #ef5350 !important; color: #ef5350 !important; }
#sellamt:hover { background: #ef5350 !important; color: #fff !important; }

#sellall-init { border-color: #c62828 !important; color: #c62828 !important; }
#sellall-init:hover { background: #c62828 !important; color: #fff !important; }
`;
const styleSheet = document.createElement("style");
styleSheet.textContent = style;
(document.head || document.documentElement).appendChild(styleSheet);
