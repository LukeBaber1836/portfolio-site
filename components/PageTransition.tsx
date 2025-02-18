"use client";

import React from 'react'
import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const PageTransition = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();

    return (
        <AnimatePresence>
            <div key={pathname}>
                <motion.div
                    initial={{opacity: 0}}
                    animate={{
                        opacity: 1,
                        transition: { delay:0, duration: 0.5, ease: "easeInOut"}
                    }}
                >
                </motion.div>
                {children}
            </div>
        </AnimatePresence>
    )
}

export default PageTransition;
