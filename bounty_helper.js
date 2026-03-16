// ==UserScript==
// @name         Torn Bounty Helper
// @namespace    torn.bounty.helper
// @version      0.2.0
// @updateURL   https://github.com/mbcrocci/torn-scripts/raw/main/bounty_helper.js
// @downloadURL https://github.com/mbcrocci/torn-scripts/raw/main/bounty_helper.js
// @description  Quick amount and quantity helper for placing war bounties faster.
// @author       mbcrocci
// @match        https://www.torn.com/bounties.php*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE = {
    amount: "bounty_helper_selected_amount",
    qty: "bounty_helper_selected_qty",
  };

  const DEFAULT_AMOUNTS = [200000, 300000, 500000, 800000, 1000000];
  const DEFAULT_QTYS = [1, 2, 5, 10];
  const PANEL_ID = "bounty-helper-panel";

  function isAddBountyPage() {
    const params = new URLSearchParams(window.location.search);
    return (
      window.location.pathname.endsWith("/bounties.php") &&
      params.get("p") === "add"
    );
  }

  function currentXid() {
    return new URLSearchParams(window.location.search).get("XID") || "";
  }

  function parseNumber(value) {
    if (typeof value === "number")
      return Number.isFinite(value) ? Math.round(value) : 0;
    if (!value) return 0;

    const raw = String(value)
      .trim()
      .toLowerCase()
      .replace(/[$,\s]/g, "");
    if (!raw) return 0;
    if (raw.endsWith("k")) return Math.round(parseFloat(raw) * 1_000);
    if (raw.endsWith("m")) return Math.round(parseFloat(raw) * 1_000_000);
    if (raw.endsWith("b")) return Math.round(parseFloat(raw) * 1_000_000_000);

    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  function formatMoney(value) {
    return "$" + Number(value || 0).toLocaleString("en-US");
  }

  function formatCompactMoney(value) {
    const amount = Number(value || 0);
    if (amount >= 1000000) return `${amount / 1000000}M`;
    if (amount >= 1000) return `${amount / 1000}K`;
    return String(amount);
  }

  function getStorageItem(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      if (!window.localStorage) return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function getSelectedAmount() {
    return parseNumber(getStorageItem(STORAGE.amount)) || DEFAULT_AMOUNTS[0];
  }

  function setSelectedAmount(amount) {
    setStorageItem(STORAGE.amount, String(parseNumber(amount)));
  }

  function getSelectedQty() {
    const qty = parseInt(
      getStorageItem(STORAGE.qty) || String(DEFAULT_QTYS[0]),
      10,
    );
    return Number.isFinite(qty) && qty > 0 ? qty : DEFAULT_QTYS[0];
  }

  function setSelectedQty(qty) {
    setStorageItem(STORAGE.qty, String(qty));
  }

  function setNativeValue(input, value) {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function findRewardInputs() {
    return Array.from(document.querySelectorAll("input.input-money"));
  }

  function findQtyInput() {
    return document.querySelector('input[type="hidden"][name="quantity"]');
  }

  function findQtySlider() {
    return document.getElementById("qty-range-slider");
  }

  function applyAmount(amount = getSelectedAmount()) {
    const inputs = findRewardInputs();
    if (inputs.length < 2) return false;

    const numericValue = parseNumber(amount);
    const normalized = String(numericValue);
    const displayValue = Number(numericValue).toLocaleString("en-US");
    const displayInput = inputs[0];
    const valueInput = inputs[1];

    displayInput.setAttribute("data-money", normalized);
    displayInput.dataset.money = normalized;
    setNativeValue(displayInput, displayValue);

    setNativeValue(valueInput, normalized);
    return true;
  }

  function applyQuantity(qty = getSelectedQty()) {
    const input = findQtyInput();
    const slider = findQtySlider();
    if (!input && !slider) return false;

    const normalizedNumber = parseInt(qty, 10);
    const normalized = String(normalizedNumber);

    if (input) {
      setNativeValue(input, normalized);
    }

    if (slider) {
      slider.setAttribute("data-value", normalized);
      slider.dataset.value = normalized;
      slider.setAttribute("aria-valuenow", normalized);

      if (window.jQuery) {
        const $slider = window.jQuery(slider);
        if (typeof $slider.slider === "function") {
          try {
            $slider.slider("value", normalizedNumber);
          } catch (_) {}
        }

        const $handle = $slider.find(".ui-slider-handle");
        if ($handle.length) {
          $handle.html(normalized);
        }

        const $track = $slider.find(".range-slider-track");
        if ($track.length) {
          $track.css("left", normalizedNumber * 10 + "%");
        }
      }

      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return true;
  }

  function applySelections() {
    applyAmount();
    applyQuantity();
  }

  function syncAmountFromPage() {
    const inputs = findRewardInputs();
    const amount = parseNumber(inputs[1]?.value || inputs[0]?.value);
    if (!amount) return;
    setSelectedAmount(amount);
    renderSelections();
  }

  function syncQuantityFromPage() {
    const input = findQtyInput();
    const slider = findQtySlider();
    const qty = parseInt(
      input?.value ||
        slider?.dataset.value ||
        slider?.getAttribute("aria-valuenow") ||
        slider?.value ||
        "",
      10,
    );

    if (!Number.isFinite(qty) || qty <= 0) return;
    setSelectedQty(qty);
    renderSelections();
  }

  function bindSyncListeners() {
    const rewardInputs = findRewardInputs();
    rewardInputs.forEach((input) => {
      if (input.dataset.bountyHelperSyncBound === "1") return;
      input.dataset.bountyHelperSyncBound = "1";
      input.addEventListener("input", syncAmountFromPage);
      input.addEventListener("change", syncAmountFromPage);
      input.addEventListener("blur", syncAmountFromPage);
    });

    const qtyInput = findQtyInput();
    if (qtyInput && qtyInput.dataset.bountyHelperSyncBound !== "1") {
      qtyInput.dataset.bountyHelperSyncBound = "1";
      qtyInput.addEventListener("input", syncQuantityFromPage);
      qtyInput.addEventListener("change", syncQuantityFromPage);
    }

    const qtySlider = findQtySlider();
    if (qtySlider && qtySlider.dataset.bountyHelperSyncBound !== "1") {
      qtySlider.dataset.bountyHelperSyncBound = "1";
      qtySlider.addEventListener("input", syncQuantityFromPage);
      qtySlider.addEventListener("change", syncQuantityFromPage);
      qtySlider.addEventListener("mouseup", syncQuantityFromPage);
    }
  }

  function createButton(label, onClick, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderSelections() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const amountWrap = panel.querySelector("[data-role='amounts']");
    const qtyWrap = panel.querySelector("[data-role='qtys']");
    const selectedAmount = getSelectedAmount();
    const selectedQty = getSelectedQty();

    amountWrap.innerHTML = "";
    qtyWrap.innerHTML = "";

    DEFAULT_AMOUNTS.forEach((amount) => {
      const button = createButton(
        formatCompactMoney(amount),
        () => {
          setSelectedAmount(amount);
          renderSelections();
          applyAmount(amount);
        },
        "bounty-helper-chip",
      );

      if (amount === selectedAmount) button.classList.add("is-active");
      amountWrap.appendChild(button);
    });

    DEFAULT_QTYS.forEach((qty) => {
      const button = createButton(
        String(qty),
        () => {
          setSelectedQty(qty);
          renderSelections();
          applyQuantity(qty);
        },
        "bounty-helper-chip",
      );

      if (qty === selectedQty) button.classList.add("is-active");
      qtyWrap.appendChild(button);
    });

    const listingFee = Math.round(selectedAmount * 0.5);
    const total = selectedQty * selectedAmount + listingFee;
    const summary = panel.querySelector("[data-role='summary']");
    summary.textContent = `Total: ${formatMoney(total)}`;
  }

  function injectStyles() {
    if (document.getElementById("bounty-helper-styles")) return;

    const style = document.createElement("style");
    style.id = "bounty-helper-styles";
    style.textContent = `
      #${PANEL_ID} {
        margin-right: 20px;
        margin-left: 20px;
        margin-top: 10px;
        margin-bottom: 10px;
        padding: 8px 10px;
        border: 1px solid #3a3f47;
        border-radius: 10px;
        background: linear-gradient(180deg, #23262c 0%, #17191d 100%);
        color: #f2f4f8;
        font-family: Arial, sans-serif;
      }

      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .bounty-helper-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }
      #${PANEL_ID} .bounty-helper-label {
        font-size: 11px;
        color: #98a2b3;
        margin-right: 2px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      #${PANEL_ID} .bounty-helper-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      #${PANEL_ID} .bounty-helper-chip {
        appearance: none;
        border: 1px solid #4a515d;
        background: #242933;
        color: #dce3ec;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        line-height: 1.2;
        cursor: pointer;
        min-width: 30px;
        text-align: center;
      }
      #${PANEL_ID} .bounty-helper-chip.is-active {
        border-color: #8bc34a;
        color: #8bc34a;
        background: rgba(139, 195, 74, 0.12);
      }
      #${PANEL_ID} .bounty-helper-main {
        border: 1px solid #8bc34a;
        background: rgba(139, 195, 74, 0.12);
        color: #8bc34a;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        margin-left: auto;
      }
      #${PANEL_ID} .bounty-helper-summary {
        font-size: 11px;
        color: #98a2b3;
        margin-left: auto;
        white-space: nowrap;
      }
    `;

    document.head.appendChild(style);
  }

  function buildPanel() {
    if (!isAddBountyPage()) return;

    const wrap = document.querySelector(".add-bounties-wrap");
    if (!wrap) return;

    injectStyles();

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.innerHTML = `
        <div class="bounty-helper-row">
          <span class="bounty-helper-label">Reward:</span>
          <div class="bounty-helper-grid" data-role="amounts"></div>
          <span class="bounty-helper-label">Qty:</span>
          <div class="bounty-helper-grid" data-role="qtys"></div>
          <button type="button" class="bounty-helper-main" id="bounty-helper-apply">Apply</button>
          <div class="bounty-helper-summary" data-role="summary"></div>
        </div>
      `;

      panel
        .querySelector("#bounty-helper-apply")
        .addEventListener("click", applySelections);
    }

    if (wrap.firstElementChild !== panel) {
      wrap.insertBefore(panel, wrap.firstChild);
    }

    renderSelections();
  }

  function init() {
    if (!isAddBountyPage()) return;
    buildPanel();
    bindSyncListeners();
    applySelections();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
