"use client";

import React from "react";
import { BsArrowDownRight } from "react-icons/bs";
import Link from "next/link";

const services = [
  {
    num: "01",
    title: "Web Development",
    description:
      "I build responsive, production-ready websites from the ground up. Clean code, fast load times, and structured to scale as your project grows.",
    href: "/contact",
  },
  {
    num: "02",
    title: "UI/UX Design",
    description:
      "I design interfaces that are easy to navigate and pleasant to use. Layouts, color, and interactions built around how real users actually move through a product.",
    href: "/contact",
  },
  {
    num: "03",
    title: "3D Modeling",
    description:
      "I create precise 3D models built for engineering.  Have an idea? I can help you design it, optimize it for manufacturing, and get it ready to be made.",
    href: "/contact",
  },
  {
    num: "04",
    title: "3D Printing",
    description:
      "I take designs from file to physical object, handling slicing, material selection, and print settings to get you a clean, accurate result the first time.",
    href: "/contact",
  },
  {
    num: "05",
    title: "App Development",
    description:
      "I develop cross-platform apps with a focus on reliability and usability, built with the right tools for the job and structured to be maintained and extended over time.",
    href: "/contact",
  },
  {
    num: "06",
    title: "Automation",
    description:
      "I build automations using n8n and custom scripts to cut out repetitive work, connect your tools together, and keep things running without you having to touch them.",
    href: "/contact",
  },
];

const Services = () => {
  return (
    <section className="min-h-[80vh] flex flex-col justify-center py-12 xl:py-0">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[60px]">
          {services.map((service, index) => {
            return (
              <div
                key={index}
                className="flex-1 flex flex-col justify-center gap-6 group"
              >
                <div className="w-full flex justify-between items-center">
                  <div className="text-5xl font-extrabold text-outline-white text-transparent transition-all duration-500 ease-in-out">
                    {service.num}
                  </div>
                  <Link
                    href={service.href}
                    className="size-[50px] rounded-full border border-accent hover:bg-accent text-accent hover:text-black transition-all duration-500 ease-in-out flex justify-center items-center hover:-rotate-45 hover:scale-105"
                  >
                    <BsArrowDownRight className="text-3xl" />
                  </Link>
                </div>
                {/* heading */}
                <h2 className="text-[42px] font-bold leading-none text-white group-hover:text-accent transition-all duration-500 ease-in-out">
                  {service.title}
                </h2>
                {/* description */}
                <p className="text-white/60">{service.description}</p>
                {/* border */}
                <div className="border-b border-white/20 w-full"></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
