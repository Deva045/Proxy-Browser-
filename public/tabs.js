import { createProxyURL, decodeProxyURL } from "./proxy.js";

let tabs = [];
let activeTab = null;

function normalizeURL(url) {
    if (!url) {
        return "about:blank";
    }

    const trimmed = String(url).trim();
    if (!trimmed || trimmed === "about:blank") {
        return "about:blank";
    }

    if (/^(https?:\/\/|about:|data:|mailto:|blob:|javascript:)/i.test(trimmed)) {
        return trimmed;
    }

    if (trimmed.includes(" ")) {
        return trimmed;
    }

    return `https://${trimmed}`;
}

function getTabTitle(url) {
    try {
        return new URL(url).hostname || "New Tab";
    } catch (error) {
        return "New Tab";
    }
}

export function createTab(url = "about:blank") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const normalized = normalizeURL(url);

    tabs.push({
        id,
        url: normalized,
        proxyUrl: normalized === "about:blank" ? "about:blank" : createProxyURL(normalized),
        title: normalized === "about:blank" ? "New Tab" : getTabTitle(normalized),
        history: normalized === "about:blank" ? [] : [normalized],
        historyIndex: normalized === "about:blank" ? -1 : 0
    });

    activeTab = id;
    return id;
}

export function updateTabURL(id, url) {
    const tab = tabs.find((entry) => entry.id === id);
    if (!tab) {
        return;
    }

    const normalized = normalizeURL(url);
    if (!normalized || normalized === "about:blank") {
        tab.url = "about:blank";
        tab.proxyUrl = "about:blank";
        tab.history = [];
        tab.historyIndex = -1;
        return;
    }

    const decoded = decodeProxyURL(normalized);
    const finalURL = decoded && decoded.startsWith("http") ? decoded : normalized;

    if (tab.history[tab.historyIndex] === finalURL) {
        tab.url = finalURL;
        tab.proxyUrl = createProxyURL(finalURL);
        return;
    }

    tab.url = finalURL;
    tab.proxyUrl = createProxyURL(finalURL);

    tab.history = tab.history.slice(0, tab.historyIndex + 1);
    tab.history.push(finalURL);
    tab.historyIndex = tab.history.length - 1;
}

export function goBack(id) {
    const tab = tabs.find((entry) => entry.id === id);
    if (!tab) {
        return null;
    }

    if (tab.historyIndex > 0) {
        tab.historyIndex -= 1;
        tab.url = tab.history[tab.historyIndex];
        tab.proxyUrl = createProxyURL(tab.url);
    }

    return tab;
}

export function goForward(id) {
    const tab = tabs.find((entry) => entry.id === id);
    if (!tab) {
        return null;
    }

    if (tab.historyIndex < tab.history.length - 1) {
        tab.historyIndex += 1;
        tab.url = tab.history[tab.historyIndex];
        tab.proxyUrl = createProxyURL(tab.url);
    }

    return tab;
}

export function updateTabTitle(id, title) {
    const tab = tabs.find((entry) => entry.id === id);
    if (tab && title) {
        tab.title = title;
    }
}

export function closeTab(id) {
    tabs = tabs.filter((entry) => entry.id !== id);

    if (activeTab === id) {
        activeTab = tabs.length ? tabs[0].id : null;
    }
}

export function switchTab(id) {
    const tab = tabs.find((entry) => entry.id === id);
    if (tab) {
        activeTab = id;
    }
    return tab;
}

export function getTabs() {
    return tabs;
}

export function getActiveTab() {
    return tabs.find((entry) => entry.id === activeTab) || null;
}
