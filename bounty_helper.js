// ==UserScript==
// @name         Torn Bounty Helper
// @namespace    torn.bounty.helper
// @version      0.2.0
// @description  Quick amount and quantity helper for placing war bounties faster.
// @author       mbcrocci
// @match        https://www.torn.com/bounties.php*
// @grant        none
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
  const STATUS_ID = "bounty-helper-status";

  let observerDebounce = null;

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

  function getSelectedAmount() {
    return (
      parseNumber(localStorage.getItem(STORAGE.amount)) || DEFAULT_AMOUNTS[0]
    );
  }

  function setSelectedAmount(amount) {
    localStorage.setItem(STORAGE.amount, String(parseNumber(amount)));
  }

  function getSelectedQty() {
    const qty = parseInt(
      localStorage.getItem(STORAGE.qty) || String(DEFAULT_QTYS[0]),
      10,
    );
    return Number.isFinite(qty) && qty > 0 ? qty : DEFAULT_QTYS[0];
  }

  function setSelectedQty(qty) {
    localStorage.setItem(STORAGE.qty, String(qty));
  }

  function setStatus(message, type = "info") {
    const el = document.getElementById(STATUS_ID);
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
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
    const amountOk = applyAmount();
    const qtyOk = applyQuantity();

    if (amountOk && qtyOk) {
      setStatus(
        `Applied ${formatMoney(getSelectedAmount())} ×${getSelectedQty()}`,
        "ok",
      );
      return;
    }

    if (!amountOk && !qtyOk) {
      setStatus("Could not find reward or quantity field", "error");
      return;
    }

    if (!amountOk) {
      setStatus("Could not find the reward per hospitalization field", "error");
      return;
    }

    setStatus("Could not find the quantity field", "error");
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
          if (applyAmount(amount)) {
            setStatus(`Reward set to ${formatMoney(amount)}`, "ok");
          } else {
            setStatus(
              "Could not find the reward per hospitalization field",
              "error",
            );
          }
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
          if (applyQuantity(qty)) {
            setStatus(`Quantity set to ${qty}`, "ok");
          } else {
            setStatus("Could not find the quantity field", "error");
          }
        },
        "bounty-helper-chip",
      );

      if (qty === selectedQty) button.classList.add("is-active");
      qtyWrap.appendChild(button);
    });

    const summary = panel.querySelector("[data-role='summary']");
    summary.textContent = `Ready: ${selectedQty} × ${formatMoney(selectedAmount)}`;
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
      #${STATUS_ID} {
        margin-top: 6px;
        font-size: 11px;
        color: #98a2b3;
      }
      #${STATUS_ID}[data-type='ok'] { color: #8bc34a; }
      #${STATUS_ID}[data-type='error'] { color: #ef5350; }
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
          <span class="bounty-helper-label">Quick:</span>
          <div class="bounty-helper-grid" data-role="amounts"></div>
          <span class="bounty-helper-label">Qty:</span>
          <div class="bounty-helper-grid" data-role="qtys"></div>
          <button type="button" class="bounty-helper-main" id="bounty-helper-apply">Apply</button>
          <div class="bounty-helper-summary" data-role="summary"></div>
        </div>
        <div id="${STATUS_ID}"></div>
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

    const observer = new MutationObserver(() => {
      if (observerDebounce) window.clearTimeout(observerDebounce);
      observerDebounce = window.setTimeout(() => {
        buildPanel();
      }, 150);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
