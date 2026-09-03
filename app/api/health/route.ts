export function GET() {
  return Response.json({
    ok: true,
    environment: process.env.SITE_ENV === 'development' ? 'development' : 'production',
  });
}
