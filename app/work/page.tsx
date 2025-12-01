"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { BsArrowUpRight, BsGithub, BsInfoCircle, BsX } from "react-icons/bs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import Link from "next/link";
import Image from "next/image";
import WorkSliderBtns from "@/components/WorkSliderBtns";

// Helper function to parse markdown links and convert to JSX
const parseMarkdownLinks = (text: string) => {
  const parts = [];
  let lastIndex = 0;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add the link
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
      >
        {match[1]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const projects = [
  {
    num: "Cloud Slicer",
    title: "Why Cloud Slicer?",
    description:
      "Built from the ground up, Cloud Slicer offers instant quoting for 3D printing services through its simple and easy to use REST API.  The API is built on top of the [Prusa Slicer CLI](https://github.com/prusa3d/PrusaSlicer) and is built for speed and maximum scalability.",
    stack: "Next.js, React, Tailwind CSS, Typescript, Python, FastAPI",
    image: "/assets/work/thumb1.png",
    live: "https://www.cloudslicer3d.com/",
    github: "https://github.com/Cloud-Slicer",
    details: (
      <div className="space-y-6">
        <div className="space-y-6 text-lg">
          <p className="text-white/90 leading-relaxed">
            One day, I was browsing{" "}
            <Link
              href="https://www.xometry.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Xometry's
            </Link>{" "}
            website and noticed their seamless checkout experience. How did they
            do it? How were they generating manufacturing quotes on the fly?
            Anyone who has purchased 3D-printed parts knows that the hardest
            part of estimating cost is getting bids from manufacturers. It often
            requires several rounds of back-and-forth when all you really want
            is a rough estimate. In the end, it wastes time for both the
            customer and the manufacturer.
          </p>

          <div className="flex flex-col justify-center py-4">
            <div className="relative flex justify-center items-center w-full h-full rounded-lg overflow-clip">
              <Image
                width={1600}
                height={900}
                className="rounded-xl hover:cursor-grab active:cursor-grabbing object-cover"
                src="/assets/work/thumb1/image1.png"
                alt="Xometry Demo"
              />
            </div>
            <p className="text-center text-accent my-5">
              A preview of Xometry&apos;s quoting tool
            </p>
          </div>

          <p className="text-white/90 leading-relaxed">
            Companies like{" "}
            <Link
              href="https://www.xometry.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Xometry
            </Link>
            ,{" "}
            <Link
              href="https://jlcpcb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              JLCPCB
            </Link>
            , and{" "}
            <Link
              href="https://www.pcbway.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              PCBWay
            </Link>{" "}
            learned from this challenge and built proprietary auto-quoting
            tools. These systems work well for them, but what about smaller
            manufacturers—those running 3D-printing farms—who want to offer the
            same service?
          </p>

          <p className="text-white/90 leading-relaxed">
            That question sent me down a path of researching how instant quoting
            works and what solutions already exist. The tools I found fit into
            two categories: too expensive and geared toward industrial use, or
            overly rigid with no room for customization.
          </p>

          <p className="text-white/90 leading-relaxed">
            My idea was simple: instead of building the full auto-quoting
            system, build the foundation they all share—a REST API. That would
            give users the freedom to design their own quoting tools or any
            other automation they want. With tools like Claude Code, Cursor, and
            GitHub Copilot, the barrier to entry is lower than ever. Even people
            with little coding experience can build useful tools in seconds—if
            they have the right data sources.
          </p>

          <div className="flex flex-col justify-center py-4">
            <div className="relative flex justify-center items-center w-full h-full rounded-lg overflow-clip px-20">
              <Image
                width={1600}
                height={900}
                className="rounded-xl hover:cursor-grab active:cursor-grabbing object-cover"
                src="/assets/work/thumb1/image2.png"
                alt="Cloud Slicer Demo"
              />
            </div>
            <p className="text-center text-accent my-5">
              An example quoting tool built off of Cloud Slicer&apos; Rest API
            </p>
          </div>

          <p className="text-white/90 leading-relaxed">
            Fast forward several months:{" "}
            <Link
              href="https://www.cloudslicer3d.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Cloud Slicer is now in Beta
            </Link>
            , with active users testing its features and giving valuable
            feedback. The lessons learned along the way have been the real
            reward. The project is still evolving, and I'm excited to see where
            it goes and what more I'll learn.
          </p>
        </div>
      </div>
    ),
  },
  {
    num: "Poly Hammer",
    title: "My Role at Poly Hammer",
    description:
      "Poly Hammer revolutionized the animation industry with its Meta-Human DNA Blender Addon.  For the first time, artists can easily import, rig, and animate Meta-Humans directly within Blender, streamlining workflows and enhancing creativity.",
    stack:
      "Next.js, React, Tailwind CSS, Typescript, Python, FastAPI, Typer, PyTest, Terraform, Github Actions",
    image: "/assets/work/thumb2.png",
    live: "https://www.polyhammer.com/",
    github: "https://github.com/poly-hammer",
    details: (
      <div className="space-y-6">
        <div className="space-y-6 text-lg">
          <p className="text-white/90 leading-relaxed">
            Poly Hammer was developed in partnership with another engineer with
            extensive experience in 3D animation and game design. My primary
            responsibilities included building the full frontend of the website
            and integrating it with{" "}
            <Link
              href="https://stripe.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Stripe's API
            </Link>{" "}
            for customer onboarding and billing.
          </p>

          <p className="text-white/90 leading-relaxed">
            I also implemented the backend using{" "}
            <Link
              href="https://www.python.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Python
            </Link>{" "}
            and{" "}
            <Link
              href="https://fastapi.tiangolo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              FastAPI
            </Link>
            , following best practices for rapid development with fully
            automated CI/CD using{" "}
            <Link
              href="https://github.com/features/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Github Actions
            </Link>{" "}
            and{" "}
            <Link
              href="https://www.terraform.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Terraform
            </Link>
            , and comprehensive unit testing with{" "}
            <Link
              href="https://pytest.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              PyTest
            </Link>
            .
          </p>

          <p className="text-white/90 leading-relaxed">
            In addition to the web application, I contributed to the creation of
            the{" "}
            <span className="text-accent font-semibold">
              Poly Hammer Build Tool
            </span>
            —a command-line utility built with{" "}
            <Link
              href="https://typer.tiangolo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Typer
            </Link>{" "}
            used to compile source code and generate the binaries required for
            Blender to load the Meta-Human DNA addon. Developing this toolchain
            was a highly involved effort and provided deep experience in
            delivering a production-grade system.
          </p>

          <p className="text-white/90 leading-relaxed">
            Today,{" "}
            <span className="text-accent font-semibold">
              Poly Hammer supports several hundred active monthly users
            </span>{" "}
            and continues to onboard new customers through the payment pipeline
            and FastAPI backend that I built.
          </p>
        </div>
      </div>
    ),
  },
  {
    num: "Cowgirl Beef",
    title: "Cowgirl Beef",
    description:
      "Cowgirl Beef is a local family farm focused on one thing: producing the highest quality grass-fed beef possible.  To match this mission, I created a customized website with an old-school western aesthetic that reflects their brand and values.",
    stack: "Next.js, React, Tailwind CSS, Typescript, Framer Motion",
    image: "/assets/work/thumb3.png",
    live: "https://cowgirl-beef.vercel.app/",
    github: "https://github.com/LukeBaber1836/cowgirl_beef",
    details: (
      <div className="space-y-6">
        <div className="space-y-6 text-lg">
          <p className="text-white/90 leading-relaxed">
            Working with Cowgirl Beef was a one-of-a-kind project. The client
            wanted a website that felt modern, while still carrying the rustic
            character you'd expect from Texas ranching and premium beef. To
            capture that balance, I explored multiple color palettes before
            settling on a deep burgundy paired with light tan and subtle gray
            accents. The result feels warm, grounded, and unmistakably Texan.
          </p>

          <p className="text-white/90 leading-relaxed">
            To bring a modern touch, I used{" "}
            <Link
              href="https://www.framer.com/motion/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Framer Motion
            </Link>{" "}
            to craft interactive experiences—most notably the{" "}
            <Link
              href="https://cowgirl-beef.vercel.app/#about"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              draggable card gallery
            </Link>{" "}
            and the a
            <Link
              href="https://cowgirl-beef.vercel.app/#products"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              "Cowstimator"
            </Link>
            , a dynamic tool that lets visitors calculate the cost of their
            custom beef package.
          </p>
          <p className="text-white/90 leading-relaxed">
            Whether I perfectly nailed the look or landed a little off target,
            I'll let you be the judge. What I can say is that this design
            challenge pushed me to expand my creative approach and sharpen my
            web-design instincts in a very different way.
          </p>
        </div>
      </div>
    ),
  },
];

const Work = () => {
  const [project, setProject] = useState(projects[0]);
  const handleSlideChange = (swiper: any) => {
    // get current slide index
    const currentIndex = swiper.activeIndex;
    // update project state
    setProject(projects[currentIndex]);
  };

  return (
    <div className="min-h-[80hvh] flex flex-col justify-center py-12 xl:px-0">
      <div className="container mx-auto">
        <div className="flex flex-col xl:flex-row xl:gap-[30px]">
          <div className="w-full xl:w-1/2 xl:h-[460px] flex flex-col xl:justify-between order-2 xl:order-none">
            <div className="flex flex-col gap-[30px] h-1/2">
              {/* outline num */}
              <div className="text-8xl leading-none front-extrabold text-transparent text-outline">
                {project.num}
              </div>
              {/* project description */}
              <p className="text-white/60">
                {parseMarkdownLinks(project.description)}
              </p>
              {/* stack */}
              <p className="flex gap-2 text-accent">{project.stack}</p>
              {/* border */}
              <div className="border border-white/20"></div>
              {/* buttons */}
              <AnimatePresence key={project.title} mode="sync">
                <div className="flex items-center gap-4">
                  {/* live project button */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      delay: 0.2,
                      duration: 0.5,
                      type: "spring",
                      stiffness: 80,
                    }}
                  >
                    <Link href={project.live} target="_blank">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger className="w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group">
                            <BsArrowUpRight className="text-white text-3xl group-hover:text-accent" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Live Project</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Link>
                  </motion.div>
                  {/* github project button */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      delay: 0.4,
                      duration: 0.5,
                      type: "spring",
                      stiffness: 80,
                    }}
                  >
                    <Link href={project.github} target="_blank">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger className="w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group">
                            <BsGithub className="text-white text-3xl group-hover:text-accent" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>GitHub repository</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Link>
                  </motion.div>
                  {/* details button */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      delay: 0.6,
                      duration: 0.5,
                      type: "spring",
                      stiffness: 80,
                    }}
                  >
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <AlertDialog>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger className="w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group">
                              <BsInfoCircle className="text-white text-3xl group-hover:text-accent" />
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>More Details</p>
                          </TooltipContent>
                          <AlertDialogContent className="bg-primary max-w-3xl max-h-[80vh] overflow-y-auto scrollbar-hide">
                            <AlertDialogCancel className="absolute right-4 top-4 rounded-full bg-transparent h-auto w-auto p-0 border-none hover:cursor-pointer hover:bg-red-500/10">
                              <BsX className="size-10 text-red-500" />
                              <span className="sr-only">Close</span>
                            </AlertDialogCancel>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl text-white">
                                {project.title}
                              </AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="text-white/80">
                                  {project.details}
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-center pt-4">
                              <AlertDialogCancel className="bg-red-500/10 text-red-500 border-red-500 font-semibold px-8 py-2 rounded-full transition-all duration-300 w-full hover:bg-red-500/30 hover:text-white">
                                Close
                              </AlertDialogCancel>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                </div>
              </AnimatePresence>
            </div>
          </div>
          <div className="w-full xl:w-1/2">
            <Swiper
              spaceBetween={30}
              slidesPerView={1}
              className="xl:h-[520px] mb-12"
              onSlideChange={handleSlideChange}
            >
              {projects.map((project, i) => (
                <SwiperSlide key={i} className="w-full">
                  <div className="h-[460px] relative group flex justify-center items-center">
                    {/* Image */}
                    <div className="relative flex justify-center items-center w-full h-full rounded-lg overflow-clip">
                      <Image
                        width={1600}
                        height={900}
                        className="rounded-xl hover:cursor-grab active:cursor-grabbing object-cover"
                        src={project.image}
                        alt={project.title}
                      />
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              {/* slider buttons */}
              <WorkSliderBtns
                containerStyles="flex gap-2 absolute right-0 bottom-[calc[50%_-_22px)] xl:bottom-0 z-20 w-full justify-between xl:w-max xl:justify-none"
                btnStyles="bg-accent group hover:bg-primary text-primary text-[22px] w-[44px] h-[44px] flex justify-center items-center transition-all duration-300 rounded-full"
                iconStyles="text-[28px] text-primary group-hover:text-accent"
              />
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Work;
