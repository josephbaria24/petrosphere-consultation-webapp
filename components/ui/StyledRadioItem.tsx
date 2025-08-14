// components/ui/StyledRadioItem.tsx
"use client";

import * as React from "react";
import { RadioGroupItem } from "../../@/components/ui/radio-group";
import { cn } from "../../lib/utils";


export function StyledRadioItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupItem>) {
  return (
    <RadioGroupItem
      className={cn(
        "peer h-5 w-5 rounded-full border-2 border-gray-400",
        "transition-colors duration-150 ease-in-out",
        "hover:border-blue-400 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.3)]", // hover ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2", // focus
        "checked:border-blue-600 checked:bg-blue-600", // selected
        "checked:after:content-[''] checked:after:block checked:after:w-2.5 checked:after:h-2.5 checked:after:rounded-full checked:after:bg-white checked:after:mx-auto checked:after:my-auto",
        className
      )}
      {...props}
    />
  );
}
