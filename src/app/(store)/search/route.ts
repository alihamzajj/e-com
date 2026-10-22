import { NextResponse, type NextRequest } from "next/server";

/** /search?q=… → /products?q=… (keeps old links and browser search shortcuts working). */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
  const url = new URL("/products", request.url);
  if (q.trim()) url.searchParams.set("q", q.trim());
  return NextResponse.redirect(url);
}
