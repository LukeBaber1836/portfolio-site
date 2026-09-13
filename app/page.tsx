"use client";

import React from "react";

import Link from "next/link";
import { FiDownload } from "react-icons/fi";
import Socials from "@/components/Socials";
import Photo from "@/components/Photo";
import Stats from "@/components/Stats";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Home = () => {
  return (
    <section className="min-h-[80vh] flex flex-col justify-center">
      <div className="container mx-auto">
        <div className="flex flex-col xl:flex-row items-center justify-between xl:pt-8 xl:pb-24">
          {/* text */}
          <div className="text-center xl:text-left order-2 xl:order-none">
            <h1 className="h1">
              Hello I&apos;m <br />{" "}
              <span className="inline-block bg-gradient-to-r from-gold-d1 via-gold-l2 to-gold-d1 bg-clip-text text-transparent">
                Luke Baber
              </span>
            </h1>
            <p className="max-w-[500px] mb-9 text-white/80">
              I excel at packaging complex technology into clear solutions
              customers can trust by utilizing my hands on experience in a
              diverse set of technologies.
            </p>
            {/* button and socials */}
            <div className="flex flex-col xl:flex-row items-center gap-8">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0, duration: 1, ease: "easeInOut" }}
              >
                <Link
                  href="/files/resume_lukebaber_2025.pdf"
                  download={true}
                  target="_blank"
                >
                  <Button variant="goldOutline" className="uppercase">
                    <span>Download CV</span>
                    <FiDownload className="text-xl" />
                  </Button>
                </Link>
              </motion.div>
              <div className="mb-8 xl:mb-0">
                <Socials
                  containerStyles="flex gap-6"
                  iconStyles="w-9 h-9 text-base"
                />
              </div>
            </div>
          </div>
          {/* photo */}
          <div className="order-1 xl:order-none mb-8 xl:mb-0">
            <Photo />
          </div>
        </div>
      </div>
      <Stats />
      <div className="absolute -bottom-10 right-0">
        <p className="w-[200px] text-[8px] text-muted p-1">* squares map to GitHub Activity</p>
      </div>
    </section>
  );
};

export default Home;
