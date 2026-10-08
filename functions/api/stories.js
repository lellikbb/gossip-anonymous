const allowedCategories = new Set([
  "Неловкий момент", "Отношения", "Работа или учёба", "Смешная история", "Другое"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, text, category, created_at AS createdAt FROM stories WHERE hidden = 0 ORDER BY created_at DESC LIMIT 200"
    ).all();
    return json({ stories: results });
  } catch {
    return json({ error: "База данных пока не настроена. Следуй инструкции README.txt." }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const category = allowedCategories.has(body.category) ? body.category : "Другое";
    if (text.length < 5) return json({ error: "Напиши историю чуть подробнее (минимум 5 символов)." }, 400);
    if (text.length > 1500) return json({ error: "История слишком длинная: максимум 1500 символов." }, 400);

    // Lightweight best-effort rate limit; stronger anti-spam can be added later.
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM stories WHERE ip_hash = ? AND created_at > datetime('now', '-1 minute')"
    ).bind(await hashIp(ip)).first();
    if (recent && recent.count >= 5) {
      return json({ error: "Слишком много публикаций. Попробуй через минуту." }, 429);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO stories (id, text, category, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, text, category, createdAt, await hashIp(ip)).run();
    return json({ ok: true, story: { id, createdAt } }, 201);
  } catch {
    return json({ error: "Не удалось опубликовать. Проверь, что база данных подключена." }, 400);
  }
}

async function hashIp(ip) {
  const bytes = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
