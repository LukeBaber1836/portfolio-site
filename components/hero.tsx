import React from 'react'
import { Spotlight } from './ui/Spotlight'
import { GridBackgroundDemo } from './ui/Grid'
import { TextGenerateEffect } from './ui/TextGenerateEffect'
import MagicButton from './ui/MagicButton'

import { FaLocationArrow } from "react-icons/fa6";


function hero() {
  return (
    <div className='pb-20 pt-36'>
        <div>
            <Spotlight className='-top-40 -left-10 md:-left-32 md:-top-20 h-screen' fill='white'/>
            <Spotlight className='top-10 left-full h-[80vh] w-[50vw]' fill='purple'/>
            <Spotlight className='top-28 left-80 h-[vh] w-[50w]' fill='blue'/>
        </div>

        <GridBackgroundDemo/>

        <div className='flex justify-center relative my-20 z-10'>
            <div className='max-w-[89vw] md:max-w-2xl lg:max-w-[60vw] flex flex-col items-center justify-center'>
                <h2 className='uppercase tracking-widest text-xs text-center text-blue-100 max-w-80'>
                    Dynamic Web Magic with Next.js
                </h2>

                <TextGenerateEffect 
                    className='text-center text-[40px] md:text-5xl lg:tex-6xl'
                    words='Transforming Concepts into Seamless User Experiences' 
                />

                <p className='text-center md:tracking-wider mb-4 text-sm md:text-lg lg:text-2xl'>
                    Hello, I&apos;m Luke, a Next.js web developer in Texas.
                </p>

                <a href='#'>
                    <MagicButton
                        title="Show my Work"
                        icon={<FaLocationArrow />}
                        position='left'
                    />
                </a>
            </div>
        </div>

    </div>
  )
}

export default hero