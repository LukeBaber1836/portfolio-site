"use client";

import React from "react";
import Link from "next/link";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { motion } from "framer-motion";

const socials = [
  { icon: <FaGithub />, path: "https://github.com/LukeBaber1836" },
  {
    icon: <FaLinkedin />,
    path: "https://www.linkedin.com/in/luke-baber-3-100/",
  },
  { icon: <FaXTwitter />, path: "https://x.com/luke_baber1" },
];

const Socials = ({
  containerStyles = "",
  iconStyles = "",
}: {
  containerStyles?: string;
  iconStyles?: string;
}) => {
  return (
    <div className={containerStyles}>
      {socials.map((item, index) => {
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.2,
              duration: 0.5,
              ease: "easeInOut",
            }}
          >
            <Link href={item.path} className={iconStyles}>
              {item.icon}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Socials;
