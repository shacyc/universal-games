/**
 * The platform Worker.
 *
 * One deploy serves the whole site: the assembled static tree (hub at `/`,
 * each game at `/g/<slug>/`) comes from the `ASSETS` binding, and everything
 * under `/api/` is handled here. `wrangler.jsonc` sets `run_worker_first` to
 * `/api/*`, so static requests never pay for a Worker invocation — the
 * fallthrough to `ASSETS` below only runs if that routing is ever widened.
 *
 * Keeping the API same-origin with the shell and the games is deliberate:
 * the SDK host talks to it with a plain same-origin `fetch`, no CORS.
 *
 * v0 has no backend features (see CLAUDE.md). This is the seam they land in.
 */
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
