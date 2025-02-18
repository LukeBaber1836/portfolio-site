import React from 'react';

import Link from 'next/link';
import { FiDownload } from "react-icons/fi";
import Socials from '@/components/Socials';
import Photo from '@/components/Photo';
import Stats from '@/components/Stats';

const Home = () => {
  return (
    <section className='h-full'>
      <div className='container mx-auto h-full'>
        <div className='flex flex-col xl:flex-row items-center justify-between xl:pt-8 xl:pb-24'>
          {/* text */}
          <div className='text-center xl:text-left order-2 xl:order-none'>
            <span className='text-xl text-primary-1'>Software Developer</span>
            <h1 className='h1'>
              Hello I'm <br/> <span className='text-accent'>Luke Baber</span>
            </h1>
            <p className='max-w-[500px] mb-9 text-white/80'>
              I excel at crafting elegant digital expereiences and I am proficient in various programming languages and tecnologies.
            </p>
            {/* button and socials */}
            <div className='flex flex-col xl:flex-row items-center gap-8'>
              <Link
                href='/files/resume_lukebaber_2025.pdf'
                download={true}
                target='_blank'
                className='uppercase flex items-center rounded-full px-5 py-2 gap-2 border border-accent bg-transparent text-accent hover:bg-accent hover:text-primary'
                >
                <span>Download CV</span>
                <FiDownload className='text-xl'/>
              </Link>
              <div className='mb-8 xl:mb-0'>
                <Socials 
                  containerStyles='flex gap-6' 
                  iconStyles='w-9 h-9 border border-accent rounded-full flex justify-center items-center text-accent text-base hover:bg-accent hover:text-primary hover:transition-all duration-500 ease-in-out'
                />
              </div>
            </div>
          </div>
          {/* photo */}
          <div className='order-1 xl:order-none mb-8 xl:mb-0'>
            <Photo/>
          </div>
        </div>
      </div>
      <Stats />
    </section>
  )
}

export default Home

