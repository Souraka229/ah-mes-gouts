"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/types/order";

type OrderStepperProps = {
  currentStatus: OrderStatus;
};

export function OrderStepper({ currentStatus }: OrderStepperProps) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:justify-between">
      {ORDER_STATUS_FLOW.map((status, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <li
            key={status}
            className="relative flex flex-1 flex-col items-center px-2 py-4 sm:py-0"
          >
            {index < ORDER_STATUS_FLOW.length - 1 && (
              <span
                className={cn(
                  "absolute top-5 left-[calc(50%+20px)] hidden h-0.5 w-[calc(100%-40px)] sm:block",
                  isComplete ? "bg-success" : "bg-border",
                )}
                aria-hidden
              />
            )}

            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? 1.08 : 1,
              }}
              className={cn(
                "relative z-10 flex size-10 items-center justify-center rounded-full border-2 font-body text-sm font-semibold transition-colors duration-300",
                isComplete && "border-success bg-success text-primary-foreground",
                isCurrent && "border-primary bg-primary text-primary-foreground shadow-md",
                isUpcoming && "border-border bg-card text-muted-foreground",
              )}
            >
              {isComplete ? (
                <Check className="size-5" aria-hidden />
              ) : (
                index + 1
              )}
            </motion.div>

            <p
              className={cn(
                "mt-3 text-center font-body text-xs font-medium sm:text-sm",
                isCurrent ? "text-primary" : "text-muted-foreground",
              )}
            >
              {ORDER_STATUS_LABELS[status]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
