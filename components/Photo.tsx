"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const Photo = () => {
  return (
    <div className="w-full h-full relative">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: {
            delay: 0.5,
            duration: 0.5,
            ease: "easeInOut",
          },
        }}
      >
        {/* image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: {
              delay: 0.5,
              duration: 1.5,
              ease: "easeInOut",
            },
          }}
          className="w-[298px] h-[298px] xl:w-[500px] xl:h-[500px] mix-blend-lighten absolute rounded-full"
        >
          <Image
            src="/images/headshot.png"
            priority
            sizes="(max-width: 768px) 298px, 500px"
            quality={100}
            fill={true}
            alt="Luke Baber headshot"
            className="object-contain rounded-full"
          />
        </motion.div>

        {/* circle */}
        <motion.svg
          className="w-[300px] h-[300px] xl:w-[506px] xl:h-[506px] z-50 overflow-visible"
          fill="transparent"
          viewBox="0 0 506 506"
          xmlns="http://www.w3.org/2000/svg"
          overflow="visible"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.circle
            cx="253"
            cy="253"
            r="250"
            stroke="#f6df9e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ strokeDasharray: "24 10 0 0" }}
            animate={{
              strokeDasharray: ["15 120 25 25", "16 25 92 72", "4 250 22 22"],
              rotate: [60, 200],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            style={{ filter: "url(#glow)" }}
          />
        </motion.svg>
      </motion.div>
    </div>
  );
};

export default Photo;
