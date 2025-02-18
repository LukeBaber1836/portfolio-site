"use client";

import React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select'

import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import { motion } from 'framer-motion'

const info = [
  {
    icon: <FaPhoneAlt />,
    title: "Phone",
    description: "+1 234 567 890"
  },
  {
    icon: <FaEnvelope />,
    title: "Email",
    description: "luke.baber1@gmail.com"
  },
  {
    icon: <FaMapMarkerAlt />,
    title: "Address",
    description: "Tyler, TX"
  }
]

const Contact = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: { 
          delay: 2.4,
          duration: 0.4,
          ease: "easeIn"
        }
      }}
      className='py-6'
    >
      <div className='container mx-auto'>
        <div className='flex flex-col xl:flex-row gap-[30px]'>
        {/* form */}
        <div className='xl:w-[54%] order-2 xl:order-none'>
          <form className='flex flex-col gap-6 p-10 bg-[#27272c] rounded-xl'>
            <h3 className='text-4xl text-accent'>
              Let's work together
            </h3>
            <p>
              Fill out the form below to get in touch with me and I'll get back to you as soon as possible!
            </p>
            {/* input */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Input type='firstname' placeholder='First Name' />
              <Input type='lastname' placeholder='Last Name' />
              <Input type='email' placeholder='Email Address' />
              <Input type='phone' placeholder='Phone Number' />
            </div>
            <Select>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select a service' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Select a service</SelectLabel>
                  <SelectItem value='est'>Web Development</SelectItem>
                  <SelectItem value='cst'>UI/UX Design</SelectItem>
                  <SelectItem value='mst'>3D Modeling/Printing</SelectItem>
                  <SelectItem value='nst'>Prototyping</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* text area */}
            <Textarea 
              className='h-[100px]'
              placeholder='Type your message here'
            />
            {/* button */}
            <Button size='md' className='max-w-40 shadow-xl'>
              Send Message
            </Button>

          </form>
        </div>
        {/* info */}
        <div className='flex-1 flex items-center xl:justify-end order-1 xl:order-none mb-8 xl:mb-0'>
          <ul className='flex flex-col gap-10'>
            {info.map((item, index) => {
              return (
                <li key={index} className='flex items-center gap-6'>
                  <div className='w-[52px] h-[52px] xl:w-[72px] xl:h-[72px] bg-[#27272c] text-accent rounded-full transition-all duration-300 flex items-center justify-center'>
                    <div className='text-[28px]'>
                      {item.icon}
                    </div>
                  </div>
                  <div>
                    <p className='text-white/60'>
                      {item.title}
                    </p>
                    <div>
                      <p>{item.title}</p>
                      <h3 className='text-xl'>{item.description}</h3>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        </div>
      </div>

    </motion.div>
  )
}

export default Contact
