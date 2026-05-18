import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function authHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAIL_API_KEY = process.env.GOOGLE_MAIL_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!GOOGLE_MAIL_API_KEY) throw new Error("Gmail connection is not configured");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
  };
}

function decodeHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: from.trim().toLowerCase() };
}

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
};

export const fetchGmailMessages = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ messages: GmailMessage[]; profileEmail: string | null }> => {
    const headers = authHeaders();

    // Profile (account email)
    const profileRes = await fetch(`${GATEWAY_URL}/users/me/profile`, { headers });
    if (!profileRes.ok) {
      const t = await profileRes.text();
      throw new Error(`Gmail profile failed [${profileRes.status}]: ${t}`);
    }
    const profile = (await profileRes.json()) as { emailAddress?: string };

    // List recent messages from inbox
    const listRes = await fetch(
      `${GATEWAY_URL}/users/me/messages?maxResults=25&labelIds=INBOX`,
      { headers },
    );
    if (!listRes.ok) {
      const t = await listRes.text();
      throw new Error(`Gmail list failed [${listRes.status}]: ${t}`);
    }
    const list = (await listRes.json()) as { messages?: Array<{ id: string; threadId: string }> };
    const ids = list.messages ?? [];

    const detailed = await Promise.all(
      ids.map(async (m) => {
        const r = await fetch(
          `${GATEWAY_URL}/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers },
        );
        if (!r.ok) return null;
        const d = (await r.json()) as {
          id: string;
          threadId: string;
          snippet: string;
          labelIds?: string[];
          internalDate?: string;
          payload?: { headers?: Array<{ name: string; value: string }> };
        };
        const hs = d.payload?.headers ?? [];
        const from = decodeHeader(hs, "From");
        const { email } = parseFrom(from);
        return {
          id: d.id,
          threadId: d.threadId,
          from,
          fromEmail: email,
          subject: decodeHeader(hs, "Subject") || "(no subject)",
          snippet: d.snippet ?? "",
          date: d.internalDate
            ? new Date(Number(d.internalDate)).toISOString()
            : decodeHeader(hs, "Date"),
          unread: (d.labelIds ?? []).includes("UNREAD"),
        } as GmailMessage;
      }),
    );

    return {
      messages: detailed.filter((x): x is GmailMessage => x !== null),
      profileEmail: profile.emailAddress ?? null,
    };
  },
);
