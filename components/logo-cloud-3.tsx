import { InfiniteSlider } from "@/components/infinite-slider";
import { cn } from "@/lib/utils";

type Logo = {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
    logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
    return (
        <div
            {...props}
            className={cn(
                "overflow-hidden py-8 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
                className
            )}
        >
            <div className="flex animate-infinite-scroll gap-8 group-hover:[animation-play-state:paused] w-max">
                {logos.concat(logos).map((logo, index) => (
                    <img
                        key={`${logo.alt}-${index}`}
                        alt={logo.alt}
                        className={cn(
                            "pointer-events-none select-none dark:brightness-0 dark:invert",
                            logo.className || "h-8 md:h-10"
                        )}
                        height={logo.height || "auto"}
                        loading="lazy"
                        src={logo.src}
                        width={logo.width || "auto"}
                    />
                ))}
            </div>
        </div>
    );
}
