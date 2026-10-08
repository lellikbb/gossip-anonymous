function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ params, env }) {
  try {
    const id = String(params.id || "");
    const story = await env.DB.prepare(
      "SELECT id, reports, hidden FROM stories WHERE id = ?"
    ).bind(id).first();
    if (!story || story.hidden) return json({ error: "История не найдена." }, 404);

    const reports = (story.reports || 0) + 1;
    const hidden = reports >= 3 ? 1 : 0;
    await env.DB.prepare(
      "UPDATE stories SET reports = ?, hidden = ? WHERE id = ?"
    ).bind(reports, hidden, id).run();
    return json({ ok: true });
  } catch {
    return json({ error: "Не удалось отправить жалобу." }, 400);
  }
}
