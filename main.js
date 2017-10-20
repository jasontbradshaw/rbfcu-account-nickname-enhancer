'use strict';

//
// UTILS
//

// Given a `$el` DOM element and some selectors, returns an array of DOM nodes
// matching the first selector that finds something, otherwise an empty array if
// no selectors match.
const selectFrom = ($el, ...selectors) => {
  for (let i = 0, len = selectors.length; i < len; i++) {
    const $items = $el.querySelectorAll(selectors[i]);
    if ($items.length > 0) { return Array.from($items); }
  }

  return [];
};

// Escapes the given string for direct use as HTML. The result is _not_ suitable
// for use in script tags or style blocks!
const escapeHTML = (s) => (s || '').replace(/[<>"]/g, (c) => {
  switch (c) {
  case '<':
    return '&lt;';
  case '>':
    return '&gt;';
  case '"':
    return '&quot;';
  default:
    throw new Error(`Invalid HTML escape character: '${c}'`);
  }
});


// A tagged template function for building a DOM element. Returns an array of
// constructed DOM elements, possibly containing only a single item if only a
// single item was specified in the string.
const DOM = (strings, ...values) => {
  const parts = [];
  for (let i = 0, len = Math.max(strings.length, values.length); i < len; i++) {
    const s = strings[i];
    const v = values[i];

    if (s) { parts.push(s); }
    if (v) { parts.push(escapeHTML(v)); }
  }

  const el = document.createElement('div');
  el.innerHTML = parts.join('').trim();

  return Array.from(el.childNodes);
};

// Same as `#select`, but returns the first result, or `null` if no result
// matched.
const selectFirstFrom = (...args) => selectFrom(...args)[0] || null;

//
// EXTENSION
//

// Finds all the account number/nickname pairs in the page and returns an object
// mapping string account number to an object containing details about the
// account. If no accounts are found, an empty object is returned.
const parseAccountNicknames = () => {
  const $accountRows = selectFrom(document.documentElement, '#tDepositAccounts tbody tr');

  const nicks = {};
  $accountRows.forEach(($row) => {
    const accountName = selectFirstFrom(
      $row,
      'td:first-of-type'
    ).textContent.trim();

    const $abbr = selectFirstFrom($row, 'td:nth-child(2) abbr');
    const accountNumberAbbr = $abbr.textContent.trim();
    const accountNumber = $abbr.attributes.title.value.trim();

    // We store data by abbreviation since this is all the information we have
    // on the transfers page.
    nicks[accountNumberAbbr] = {
      name: accountName,
      number: accountNumber,
    };
  });

  return nicks;
};

const STORAGE_KEY = 'rbfcu_account_nicks';

// Stores the given account nicknames to localStorage. Returns the given nicks
// object.
const storeAccountNicknames = (nicks) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nicks));
  return nicks;
};

// Loads any stored account nicknames from localStorage. If none were stored,
// returns an empty object.
const loadAccountNicknames = () => {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
};

// Injects the given account nicknames into the DOM when possible, otherwise
// does nothing.
const injectAccountNicknames = (nicks) => {
  console.log(nicks);

  const $transferRows = selectFrom(document.documentElement, '#activeTransferTable tbody tr');
  $transferRows.forEach(($row) => {
    // These columns contain text that looks like `x1234 - (Checking)`.
    const $from = selectFirstFrom($row, 'td:nth-child(3)');
    const $to = selectFirstFrom($row, 'td:nth-child(4)');

    [$from, $to].forEach(($cell) => {
      const abbr = /x\d+/g.exec($cell.textContent)[0];
      const type = /\(([^)]+)\)/g.exec($cell.textContent)[1];

      console.log(abbr, type);

      // Find the account info for this account, or sane defaults if it doesn't
      // exist.
      const accountInfo = nicks[abbr] || { name: type, number: 0 };
      console.log(accountInfo);

      let $el;
      if (type !== accountInfo.name) {
        $el = DOM`
          <div class="sortText">
            <abbr title=${accountInfo.number}>${abbr}</abbr>
            <br />
            - (<abbr title="${type}">${accountInfo.name}</abbr>)
          </div>
        `[0];
      } else {
        $el = DOM`
          <div class="sortText">
            <abbr title="${accountInfo.number}">${abbr}</abbr>
            <br />
            - (${accountInfo.name})
          </div>
        `[0];
      }

      $cell.innerHTML = '';
      $cell.appendChild($el);
    });
  });
};

if (window.location.toString().includes('accountsummary')) {
  // If we're on the account summary page, persist the nicknames for later use.
  storeAccountNicknames(parseAccountNicknames());
} else if (window.location.toString().includes('loadActiveTransfers')) {
  // If we're showing the scheduled transfers, inject the stored account
  // nicknames into the DOM.
  injectAccountNicknames(loadAccountNicknames());
}
