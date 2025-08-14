
import { Geist } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { Toaster } from "sonner"

const poppins = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // include the weights you plan to use
})

export const metadata = {
  title: "Petrosphere - Consultation Web App",
  description: "Consultation web app for Petrosphere clients",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={poppins.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster richColors position="top-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
