import { NextResponse } from "next/server";
import { getRequestActor } from "../../../../lib/server/request-auth";
import { checkIpRateLimit } from "../../../../lib/server/rate-limit";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
    try {
        const rate = checkIpRateLimit(req, "ai-chat", 45, 60_000);
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many AI requests. Please wait and try again." },
                { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
            );
        }

        const actor = await getRequestActor();
        if (!actor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const messages: ChatMessage[] = body?.messages ?? [];

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "messages[] required" }, { status: 400 });
        }
        if (messages.length > 30) {
            return NextResponse.json({ error: "Too many messages" }, { status: 400 });
        }
        const hasInvalidMessage = messages.some(
            (m) =>
                !m ||
                (m.role !== "system" && m.role !== "user" && m.role !== "assistant") ||
                typeof m.content !== "string" ||
                m.content.trim().length === 0 ||
                m.content.length > 2000
        );
        if (hasInvalidMessage) {
            return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
        }
        const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
        if (totalChars > 20000) {
            return NextResponse.json({ error: "Payload too large" }, { status: 400 });
        }

        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const token = process.env.CLOUDFLARE_API_TOKEN;

        console.log(`[API AI] Environment Check:`, {
            hasAccountId: !!accountId,
            hasToken: !!token,
            accountIdPrefix: accountId ? accountId.substring(0, 4) + '...' : 'none'
        });

        if (!accountId || !token) {
            return NextResponse.json(
                {
                    error: "Missing Cloudflare Credentials",
                    details: "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set in environment variables.",
                    isConfigError: true
                },
                { status: 500 }
            );
        }

        const model = "@cf/meta/llama-3-8b-instruct";

        // Llama 3 Instruct template for Workers AI
        let prompt = "";
        for (const msg of messages) {
            if (msg.role === 'system') {
                prompt += `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
            } else if (msg.role === 'user') {
                prompt += `<|start_header_id|>user<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
            } else if (msg.role === 'assistant') {
                prompt += `<|start_header_id|>assistant<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
            }
        }
        prompt += `<|start_header_id|>assistant<|end_header_id|>\n\n`;

        console.log(`[API AI] Running model ${model} with prompt length ${prompt.length}`);

        const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt,
                    max_tokens: 1024,
                    temperature: 0.6,
                }),
            }
        );

        const data = await r.json();
        console.log(`[API AI] Cloudflare response status: ${r.status}`);

        if (!r.ok) {
            return NextResponse.json(
                { error: "Cloudflare Workers AI request failed", details: data },
                { status: 500 }
            );
        }

        // Common shape: data.result.response (text). Exact envelope may vary by model.
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json(
            { error: "Unexpected error", details: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
