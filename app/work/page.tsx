"use client";

import React, { useState } from 'react'
import { motion } from 'framer-motion'

import { Swiper, SwiperSlide } from 'swiper/react'
import "swiper/css";

import { BsArrowUpRight, BsGithub } from 'react-icons/bs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

import Link from 'next/link';
import Image from 'next/image';
import WorkSliderBtns from '@/components/WorkSliderBtns';

const projects = [
  {
    num: '01',
    category: 'frontend',
    title: 'project 1',
    description:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus, nam.',
    stack: [
      {name: 'Html 5'},
      {name: 'Css 3'},
      {name: 'Javascript'},
    ],
    image: '/assets/work/thumb1.png',
    live: "",
    github: ""
  },
  {
    num: '02',
    category: 'fullstack',
    title: 'project 2',
    description:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus, nam.',
    stack: [
      {name: 'Next.js'},
      {name: 'Tailwind CSS'},
      {name: 'Typescript'},
    ],
    image: '/assets/work/thumb2.png',
    live: "",
    github: ""
  },
  {
    num: '03',
    category: 'fullstack',
    title: 'project 3',
    description:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus, nam.',
    stack: [
      {name: 'Next.js'},
      {name: 'Tailwind CSS'},
      {name: 'Typescript'},
      {name: 'Python'},
      {name: 'FastAPI'},
    ],
    image: '/assets/work/thumb3.png',
    live: "",
    github: ""
  }
]

const Work = () => {
  const [project, setProject] = useState(projects[0]);
  const handleSlideChange = (swiper: any) => {
    // get current slide index
    const currentIndex = swiper.activeIndex;
    // update project state
    setProject(projects[currentIndex]);
  }

  return (
    <div className='min-h-[80hvh] flex flex-col justify-center py-12 xl:px-0'>
      <div className='container mx-auto'>
        <div className='flex flex-col xl:flex-row xl:gap-[30px]'>
          <div className='w-full xl:w-1/2 xl:h-[460px] flex flex-col xl:justify-between order-2 xl:order-none'>
            <div className='flex flex-col gap-[30px] h-1/2'>
              {/* outline num */}
              <div className='text-8xl leading-none front-extrabold text-transparent text-outline'>
                {project.num}
              </div>
              {/* project category */}
              <h2 className='text-[42px] font-bold leading-none text-white group-hover:text-accent transition-all duration-500 capitalize'>
                {project.category}
              </h2>
              {/* project description */}
              <p className='text-white/60'>
                {project.description}
              </p>
              {/* stack */}
              <ul className='flex gap-4'>
                {project.stack.map((item, i) => (
                  <li key={i} className='text-xl text-accent'>
                    {item.name}
                    {/* remove the last comma */}
                    {i !== project.stack.length - 1 && ','}
                  </li>
                ))}
              </ul>
              {/* border */}
              <div className='border border-white/20'></div>
              {/* buttons */}
              <div className='flex items-center gap-4'>
                {/* live project button */}
                <Link href={project.live} target='_blank'>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger className='w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group'>
                        <BsArrowUpRight className='text-white text-3xl group-hover:text-accent'/>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Live Project</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Link>
                {/* github project button */}
                <Link href={project.live} target='_blank'>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger className='w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group'>
                        <BsGithub className='text-white text-3xl group-hover:text-accent'/>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>GitHub repository</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Link>
              </div>
            </div>
          </div>
          <div className='w-full xl:w-1/2'>
              <Swiper
                spaceBetween={30}
                slidesPerView={1}
                className='xl:h-[520px] mb-12'
                onSlideChange={handleSlideChange}
              >
                {projects.map((project, i) => (
                  <SwiperSlide key={i} className='w-full'>
                    <div className='h-[460px] relative group flex justify-center items-center'>
                      {/* Image */}
                      <div className='relative w-full h-full rounded-lg overflow-clip'>
                        <Image
                          fill={true}
                          className='rounded-xl hover:cursor-grab active:cursor-grabbing'
                          src={project.image}
                          alt={project.title}
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
                {/* slider buttons */}
                <WorkSliderBtns
                  containerStyles='flex gap-2 absolute right-0 bottom-[calc[50%_-_22px)] xl:bottom-0 z-20 w-full justify-between xl:w-max xl:justify-none'
                  btnStyles='bg-accent hover:bg-accent-hover text-primary text-[22px] w-[44px] h-[44px] flex justify-center items-center transition-all duration-300 rounded-full'
                  iconStyles='text-[28px] text-primary'
                />
              </Swiper>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Work
