import { SECURITY_HEADERS } from "../security-policy.mjs";

type MaybeNode = {
  node?: { res?: { setHeader?: (name: string, value: string) => void; headersSent?: boolean } };
};

function apply(headers: Headers) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
}

export default async function securityHeaders(event: MaybeNode, next: () => Promise<unknown>) {
  const res = event.node?.res;
  if (res?.setHeader && !res.headersSent) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
  }
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  apply(headers);
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
