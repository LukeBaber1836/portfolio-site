'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';


interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const pathname = usePathname();
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial= {{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{type: 'easeInOut', duration: 0.75 }}
            >
                {children}
                
            </motion.div>
        </AnimatePresence>
    );
};

export default Layout;