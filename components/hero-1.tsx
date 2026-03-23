import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RocketIcon, ArrowRightIcon, PhoneCallIcon } from "lucide-react";
import { LogoCloud } from "@/components/logo-cloud-3";
import Link from 'next/link';
import { useState } from "react";
import { ContactSalesDialog } from "./contact-sales-dialog";

export function HeroSection() {
    const [isContactOpen, setIsContactOpen] = useState(false);
    return (
        <section className="relative mx-auto w-full max-w-5xl">
            {/* Top Shades */}
            <div
                aria-hidden="true"
                className="absolute inset-0 isolate hidden overflow-hidden contain-strict lg:block"
            >
                <div className="absolute inset-0 -top-14 isolate -z-10 bg-[radial-gradient(35%_80%_at_49%_0%,--theme(--color-foreground/.08),transparent)] contain-strict" />
            </div>

            {/* X Bold Faded Borders */}
            <div
                aria-hidden="true"
                className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-5xl lg:block"
            >
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 -z-10 h-full w-px bg-foreground/15" />
                <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 -z-10 h-full w-px bg-foreground/15" />
            </div>

            {/* main content */}

            <div className="relative flex flex-col items-center justify-center gap-5 pt-32 pb-30">
                {/* X Content Faded Borders */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-1 size-full overflow-hidden"
                >
                    <div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
                    <div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
                    <div className="absolute inset-y-0 left-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:left-12" />
                    <div className="absolute inset-y-0 right-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:right-12" />
                </div>

                <a
                    className={cn(
                        "group mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-3 py-1 shadow",
                        "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
                    )}
                    href="#link"
                >
                    <RocketIcon className="size-3 text-muted-foreground" />
                    <span className="text-xs">shipped new features!</span>
                    <span className="block h-5 border-l" />

                    <ArrowRightIcon className="size-3 duration-150 ease-out group-hover:translate-x-1" />
                </a>

                <h1
                    className={cn(
                        "fade-in slide-in-from-bottom-10 animate-in text-balance fill-mode-backwards text-center text-4xl tracking-tight delay-100 duration-500 ease-out md:text-5xl lg:text-3xl",
                        "font-extrabold text-foreground"
                    )}
                >
                    Empower Your Safety Culture with <br /> <span className="text-[#FF7A40]">Real-Time Data</span>
                </h1>

                <p className="fade-in slide-in-from-bottom-10 mx-auto max-w-2xl animate-in fill-mode-backwards text-center text-base text-foreground/80 tracking-wider delay-200 duration-500 ease-out sm:text-lg md:text-xl">
                    Assess, monitor, and improve the health of your operational safety environment <br className="hidden md:block" /> with our comprehensive platform.
                </p>

                <div className="fade-in slide-in-from-bottom-10 flex animate-in flex-row flex-wrap items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
                    <Button
                        className="rounded-full"
                        size="lg"
                        variant="secondary"
                        onClick={() => setIsContactOpen(true)}
                    >
                        <PhoneCallIcon data-icon="inline-start" className="size-4 mr-2" />{" "}
                        Contact Sales
                    </Button>
                    <ContactSalesDialog open={isContactOpen} onOpenChange={setIsContactOpen} />
                    <Link href="/sign-in">
                        <Button className="rounded-full shadow-lg shadow-[#FF7A40]/20" size="lg">
                            Sign In{" "}
                            <ArrowRightIcon
                                className="size-4 ms-2" data-icon="inline-end" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

export function LogosSection() {
    return (
        <section className="relative space-y-4 border-t pt-6 pb-10">
            <h2 className="text-center font-medium text-lg text-muted-foreground tracking-tight md:text-xl">
                Trusted by <span className="text-foreground">experts</span>
            </h2>
            <div className="relative z-10 mx-auto max-w-4xl">
                <LogoCloud logos={logos} />
            </div>
        </section>
    );
}

const logos = [
    {
        src: "/icons/logo2.png",
        alt: "Logo 2",
        className: "h-24 md:h-28 object-contain",
    },
    {
        src: "/icons/pdn.png",
        alt: "PDN Logo",
        className: "h-40 md:h-52 object-contain",
    },
];