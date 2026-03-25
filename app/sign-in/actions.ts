'use server'

import { createClient } from "@supabase/supabase-js"
import nodemailer from 'nodemailer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create a Supabase admin client with the service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function signUpWithCustomEmail(formData: {
  email: string
  password: string
  fullName?: string
  redirectTo: string
}) {
  const { email, password, fullName, redirectTo } = formData

  try {
    // 1. Generate the signup confirmation link using the Admin API
    // This will also create the user in the auth.users table (unconfirmed)
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: fullName },
        redirectTo
      }
    })

    if (linkError) {
      console.error("Sign-up link generation error:", linkError)
      return { error: linkError.message }
    }

    const { properties } = data
    const hashedToken = properties.hashed_token
    const emailActionLink = properties.action_link

    // 2. Send the email using Nodemailer and the SMTP settings from .env.local
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendlayer.net',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const fromName = process.env.SMTP_FROM_NAME || 'Safety Vitals'
    const fromEmail = 'no-reply@petrosphere.com.ph'

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
        <h2 style="color: #1a202c; margin-bottom: 20px;">Confirm your email address</h2>
        <p style="color: #4a5568; line-height: 1.6;">Welcome to Safety Vitals! To get started, please confirm your email address by clicking the button below.</p>
        <div style="margin: 30px 0;">
          <a href="${emailActionLink}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirm Email</a>
        </div>
        <p style="color: #718096; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;">
        <p style="color: #a0aec0; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
      </div>
    `

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Confirm your Safety Vitals account',
      html: htmlContent,
      text: `Confirm your email by visiting: ${emailActionLink}`
    })

    console.log("Custom Confirmation Email sent: %s", info.messageId)

    return { success: true, user: data.user }
  } catch (error: any) {
    console.error("Custom sign-up error:", error)
    return { error: error.message || "An unexpected error occurred during sign-up." }
  }
}
