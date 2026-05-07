import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getRequestActor } from '../../../../lib/server/request-auth';
import { checkIpRateLimit } from '../../../../lib/server/rate-limit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    try {
        const rate = checkIpRateLimit(req, "email-send", 10, 60_000);
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many email requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
            );
        }

        const actor = await getRequestActor();
        if (!actor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { to, subject, html, text, fromName } = body;

        const toList = Array.isArray(to) ? to : [to];
        const cleanedTo = toList
            .map((addr) => String(addr || "").trim().toLowerCase())
            .filter(Boolean);

        if (cleanedTo.length === 0 || cleanedTo.length > 5) {
            return NextResponse.json({ error: "Invalid recipient list" }, { status: 400 });
        }
        if (!cleanedTo.every((addr) => EMAIL_REGEX.test(addr))) {
            return NextResponse.json({ error: "Invalid recipient email format" }, { status: 400 });
        }

        const safeSubject = String(subject || "").trim();
        const safeText = String(text || "");
        const safeHtml = String(html || "");
        const safeFromName = String(fromName || process.env.SMTP_FROM_NAME || "Safety Vitals").trim();

        if (!safeSubject || safeSubject.length > 180) {
            return NextResponse.json({ error: "Invalid email subject" }, { status: 400 });
        }
        if (!safeText && !safeHtml) {
            return NextResponse.json({ error: "Email content is required" }, { status: 400 });
        }
        if (safeText.length > 10000 || safeHtml.length > 25000) {
            return NextResponse.json({ error: "Email content too long" }, { status: 400 });
        }

        // Check for required env vars (optional debug)
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error("Missing SMTP Credentials");
            return NextResponse.json({ error: "Server misconfiguration: Missing SMTP Credentials" }, { status: 500 });
        }

        // Nodemailer transporter using SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.sendlayer.net',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send mail
        const info = await transporter.sendMail({
            from: `"${safeFromName}" <no-reply@petrosphere.com.ph>`,
            to: cleanedTo.join(","),
            subject: safeSubject,
            text: safeText || undefined,
            html: safeHtml || undefined,
        });

        console.log("Message sent: %s", info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error("Email API Handler Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: (error as any).message }, { status: 500 });
    }
}
