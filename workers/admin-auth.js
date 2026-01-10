export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/admin")) {
      const authHeader = request.headers.get("Authorization");
      const expected = `Basic ${btoa(`${env.ADMIN_USER}:${env.ADMIN_PASS}`)}`;

      if (authHeader !== expected) {
        return new Response("Auth required", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Admin"',
          },
        });
      }
    }

    return fetch(request);
  },
};
