"use client";

import React from "react";
import { BsArrowDownRight } from "react-icons/bs";
import Link from "next/link";

const services = [
  {
    num: "01",
    title: "Web Development",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam asperiores unde dolores voluptate, nesciunt maiores blanditiis quod!",
    href: "",
  },
  {
    num: "02",
    title: "UI/UX Design",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam asperiores unde dolores voluptate, nesciunt maiores blanditiis quod!",
    href: "",
  },
  {
    num: "03",
    title: "3D Modeling",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam asperiores unde dolores voluptate, nesciunt maiores blanditiis quod!",
    href: "",
  },
  {
    num: "04",
    title: "3D printing",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam asperiores unde dolores voluptate, nesciunt maiores blanditiis quod!",
    href: "",
  },
  {
    num: "05",
    title: "App Development",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam asperiores unde dolores voluptate, nesciunt maiores blanditiis quod!",
    href: "",
  },
  {
    num: "06",
    title: "Programming",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam asperiores unde dolores voluptate, nesciunt maiores blanditiis quod!",
    href: "",
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
                  <div className="text-5xl font-extrabold text-outline text-transparent group-hover:text-outline-hover transition-all duration-500 ease-in-out">
                    {service.num}
                  </div>
                  <Link
                    href={service.href}
                    className="w-[70px] h-[70px] rounded-full bg-white group-hover:bg-accent transition-all duration-500 ease-in-out flex justify-center items-center hover:-rotate-45 hover:scale-105"
                  >
                    <BsArrowDownRight className="text-primary text-3xl" />
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
