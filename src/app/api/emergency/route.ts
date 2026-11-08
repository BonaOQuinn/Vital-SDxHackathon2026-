import { emergencyNumber } from "@/lib/emergency";

// GET /api/emergency?country=MX -> { country, number, isFallback }
export function GET(req: Request) {
  return Response.json(emergencyNumber(new URL(req.url).searchParams.get("country")));
}
