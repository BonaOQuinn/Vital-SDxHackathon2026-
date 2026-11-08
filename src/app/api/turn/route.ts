import type { TurnRequest, TurnResponse } from "@/lib/contract";

// STUB: returns mock data matching the contract so the frontend can build now.
// Real Claude call replaces this next.
export async function POST(req: Request) {
  const { transcript } = (await req.json()) as TurnRequest;
  const res: TurnResponse = {
    speaker: "patient",
    source_lang: "en",
    translation: `[mock es] ${transcript}`,
    alerts: [],
    flagged_terms: [],
  };
  return Response.json(res);
}
