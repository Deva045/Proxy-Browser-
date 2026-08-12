import crypto from "crypto";

const sessions = new Map();

function normalizeOrigin(url) {
    try {
        const parsed = new URL(url);
        return parsed.origin;
    } catch {
        return null;
    }
}

function parseSetCookie(setCookie) {
    if (!setCookie) return [];

    const values = Array.isArray(setCookie)
        ? setCookie
        : [setCookie];

    return values
        .map((cookie) => cookie.split(";")[0].trim())
        .filter((cookie) => {
            const index = cookie.indexOf("=");
            return index > 0;
        });
}

function getCookieName(cookie) {
    const index = cookie.indexOf("=");

    if (index <= 0) {
        return null;
    }

    return cookie.substring(0, index);
}

function createCookieStore() {
    return new Map();
}

function ensureSession(id) {
    if (!sessions.has(id)) {
        sessions.set(id, {
            cookies: createCookieStore(),
            createdAt: Date.now(),
            lastAccessedAt: Date.now()
        });
    }

    const session = sessions.get(id);
    session.lastAccessedAt = Date.now();

    return session;
}

export function createSession() {
    const id = crypto
        .randomBytes(16)
        .toString("hex");

    sessions.set(id, {
        cookies: createCookieStore(),
        createdAt: Date.now(),
        lastAccessedAt: Date.now()
    });

    return id;
}

export function getSession(id) {
    return ensureSession(id);
}

export function getOriginCookies(sessionId, url) {
    const origin = normalizeOrigin(url);

    if (!origin) {
        return "";
    }

    const session = ensureSession(sessionId);
    const jar = session.cookies.get(origin);

    if (!jar) {
        return "";
    }

    return Array.from(jar.values())
        .join("; ");
}

export function setOriginCookies(sessionId, url, setCookie) {
    const origin = normalizeOrigin(url);

    if (!origin || !setCookie) {
        return;
    }

    const session = ensureSession(sessionId);

    let jar = session.cookies.get(origin);

    if (!jar) {
        jar = createCookieStore();
        session.cookies.set(origin, jar);
    }

    const cookies = parseSetCookie(setCookie);

    for (const cookie of cookies) {
        const name = getCookieName(cookie);

        if (!name) {
            continue;
        }

        const value = cookie.substring(name.length + 1);

        if (value === "") {
            jar.delete(name);
        } else {
            jar.set(name, cookie);
        }
    }

    session.lastAccessedAt = Date.now();
}

export function deleteSession(id) {
    sessions.delete(id);
}

export function clearOriginCookies(sessionId, url) {
    const origin = normalizeOrigin(url);

    if (!origin) {
        return;
    }

    const session = ensureSession(sessionId);

    session.cookies.delete(origin);
}

export function getSessionOrigins(sessionId) {
    const session = ensureSession(sessionId);

    return Array.from(session.cookies.keys());
}
