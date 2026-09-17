"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

// Rendered client-side so marketing pages stay static; the session is read from /api/auth.
const HeaderAuthButton = ({ className }: { className?: string }) => {
  const { data } = authClient.useSession();
  const user = data?.user as { role?: string | null } | undefined;
  const href = user ? (user.role === "admin" ? "/admin" : "/portal") : "/login";

  return (
    <Link href={href} className={className}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={user ? "portal" : "login"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="block"
        >
          {user ? (
            <Button effect="shineHover" className="w-full">
              {user.role === "admin" ? "Admin" : "Portal"}
            </Button>
          ) : (
            <Button variant="goldOutline" className="w-full">
              Login
            </Button>
          )}
        </motion.span>
      </AnimatePresence>
    </Link>
  );
};

export default HeaderAuthButton;
