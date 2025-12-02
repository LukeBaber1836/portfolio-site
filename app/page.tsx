"use client";

import React from "react";

import Link from "next/link";
import { FiDownload } from "react-icons/fi";
import Socials from "@/components/Socials";
import Photo from "@/components/Photo";
import Stats from "@/components/Stats";
import { motion } from "framer-motion";

const Home = () => {
  return (
    <section className="h-full">
      <div className="container mx-auto h-full">
        <div className="flex flex-col xl:flex-row items-center justify-between xl:pt-8 xl:pb-24">
          {/* text */}
          <div className="text-center xl:text-left order-2 xl:order-none">
            <h1 className="h1">
              Hello I&apos;m <br />{" "}
              <span className="bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-gold-d2 via-gold-l2 to-gold-d2 bg-clip-text text-transparent">
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
                  className="uppercase flex items-center rounded-full px-5 py-2 gap-2 border border-accent bg-transparent text-accent hover:text-primary hover:bg-gradient-to-br hover:from-gold-d1 hover:via-gold-l1 hover:to-gold-d2  hover:shadow-lg hover:shadow-accent/40 transition-all duration-300 ease-in-out"
                >
                  <span>Download CV</span>
                  <FiDownload className="text-xl" />
                </Link>
              </motion.div>
              <div className="mb-8 xl:mb-0">
                <Socials
                  containerStyles="flex gap-6"
                  iconStyles="w-9 h-9 border border-accent rounded-full flex justify-center items-center text-accent text-base hover:bg-gradient-to-tr hover:from-gold-d1 hover:via-gold-l1 hover:to-gold-d2 hover:text-primary hover:transition-all duration-500 ease-in-out"
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
    </section>
  );
};

export default Home;
