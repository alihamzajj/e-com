"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { addToCartAction } from "@/actions/cart";
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = Omit<ButtonProps, "onClick"> & { variantId: string; quantity?: number; label?: string };

export function AddToCartButton({ variantId, quantity = 1, label = "Add to cart", ...props }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await addToCartAction({ variantId, quantity });
          if (result.ok) toast.success(result.message ?? "Added to cart.");
          else toast.error(result.error);
        })
      }
    >
      {!pending ? <ShoppingBag aria-hidden /> : null}
      {label}
    </Button>
  );
}
