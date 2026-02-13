import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { to, subject, html, text, fromName, fromEmail } = body;

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
            from: `"${fromName || process.env.SMTP_FROM_NAME || 'Safety Vitals'}" <${fromEmail || 'no-reply@petrosphere.com.ph'}>`,
            to,
            subject,
            text,
            html,
        });

        console.log("Message sent: %s", info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error("Email API Handler Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: (error as any).message }, { status: 500 });
    }
}
