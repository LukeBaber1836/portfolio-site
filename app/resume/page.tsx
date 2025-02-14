'use client';

import React from 'react'
import { delay, motion } from 'framer-motion';
import { 
  FaHtml5, 
  FaCss3, 
  FaJs, 
  FaReact, 
  FaFigma, 
  FaNodeJs,
  FaDotCircle,
  FaStripe,
  FaJava
} from 'react-icons/fa';
import { 
  SiTailwindcss, 
  SiNextdotjs, 
  SiTypescript,
  SiGithub,
  SiPython,
  SiGit,
  SiOllama,
  SiGithubcopilot,
  SiCplusplus,
  SiPostgresql,
  SiTerraform,
  SiShadcnui,
  SiBootstrap,
  SiAmazonwebservices,
  SiVercel,
  SiArduino
} from 'react-icons/si';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import exp from 'constants';


const about = {
  title: 'About Me',
  description: 'I am a software engineer with a passion for building web applications. I have experience in front-end and back-end development, and I am always eager to learn new technologies and improve my skills.',
  info: [
    {
      fieldName: 'Name',
      fieldValue: 'Luke Baber'
    },
    {
      fieldName: 'Phone',
      fieldValue: '(903)-253-7363'
    },
    {
      fieldName: 'Experience',
      fieldValue: '3+ years'
    },
    {
      fieldName: 'Email',
      fieldValue: 'luke.baber1@gmail.com'
    },
    {
      fieldName: 'Freelance',
      fieldValue: 'Available'
    }
  ]
};

const experience = {
  icon: '/assets/resume/badge.svg',
  title: 'My Experience',
  description: 'I have worked in a variety of industries, giving me a well rounded background.',
  items: [
    {
      company: 'IBM',
      position: 'Technical Sales Engineer',
      duration: "July, 2023 - Present",
    },
    {
      company: 'Dematic',
      position: 'Controls Engineer Intern',
      duration: "Summer of 2022",
    },
    {
      company: 'Tyler Cellphone Computer Repair',
      position: 'Electronics Technician',
      duration: "Summer of 2021",
    },
    {
      company: 'Chick-fil-A',
      position: 'Team Member',
      duration: "May 2017 - August, 2019",
    }
  ]

};

const education = {
  icon: '/assets/resume/cap.svg',
  title: 'My Education',
  description: 'I believe education is a lifelong endevour even after graduation from University.  Learning never stops.',
  items: [
    {
      institution: 'Texas A&M University',
      degree: 'B.S. Mechatronics Engineering',
      duration: "August, 2019 - May, 2023",
    },
    {
      institution: 'The App Brewery',
      degree: 'Full Stack Web Development Bootcamp',
      duration: "2024",
    },
  ]
};

const skills = {
  title: 'My Skills',
  description: 'I have a diverse set of skills that I have acquired through my education, continual learning, and work experience.',
  items: [
    {
      icon: <SiPython />,
      name: 'Python',
      color: 'group-hover:text-yellow-300'
    },
    {
      icon: <FaReact />,
      name: 'ReactJS',
      color: 'group-hover:text-sky-500'
    },
    {
      icon: <SiTailwindcss />,
      name: 'Tailwind CSS',
      color: 'group-hover:text-teal-500'
    },
    {
      icon: <FaHtml5 />,
      name: 'HTML',
      color: 'group-hover:text-red-500'
    },
    {
      icon: <FaCss3 />,
      name: 'CSS',
      color: 'group-hover:text-blue-500'
    },
    {
      icon: <SiTypescript />,
      name: 'TypeScript',
      color: 'group-hover:text-blue-500'
    },
    {
      icon: <SiNextdotjs />,
      name: 'NextJS',
      color: 'border border-transparent group-hover:text-black group-hover:bg-white rounded-full'
    },
    {
      icon: <FaNodeJs />,
      name: 'NodeJS',
      color: 'group-hover:text-green-500'
    },
    {
      icon: <FaJs />,
      name: 'JavaScript',
      color: 'group-hover:text-yellow-400'
    },
    {
      icon: <SiPostgresql />,
      name: 'PostgreSQL',
      color: 'group-hover:text-blue-300'
    },
    {
      icon: <SiTerraform />,
      name: 'Terraform',
      color: 'group-hover:text-purple-600'
    },
    {
      icon: <SiShadcnui />,
      name: 'shadcn/ui',
      color: ''
    },
    {
      icon: <SiBootstrap />,
      name: 'Bootstrap',
      color: 'group-hover:text-purple-600'
    },
    {
      icon: <SiGithub />,
      name: 'GitHub',
      color: 'group-hover:text-purple-500'
    },
    {
      icon: <SiGit />,
      name: 'Git',
      color: 'group-hover:text-orange-600'
    },
    {
      icon: <FaFigma />,
      name: 'Figma',
      color: 'group-hover:text-red-500'
    },
    {
      icon: <FaJava />,
      name: 'Java',
      color: 'group-hover:text-orange-500'
    },
    {
      icon: <SiCplusplus />,
      name: 'C++',
      color: 'group-hover:text-blue-500'
    },
    {
      icon: <FaStripe />,
      name: 'Stripe API',
      color: 'group-hover:text-purple-400'
    },
    {
      icon: <SiOllama />,
      name: 'Ollama',
      color: ''
    },
    {
      icon: <SiGithubcopilot />,
      name: 'GitHub Copilot',
      color: 'group-hover:text-purple-500'
    },
    {
      icon: <SiAmazonwebservices />,
      name: 'Amazon Web Services',
      color: 'group-hover:text-yellow-500'
    },
    {
      icon: <SiVercel />,
      name: 'Vercel',
      color: ''
    },
    {
      icon: <SiArduino />,
      name: 'Arduino',
      color: 'group-hover:text-teal-400'
    },

  ]
}

const Resume = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: {
          delay: 2.4,
          duration: 0.4,
          ease: 'easeIn'
        }
      }}
      className='min-h-[80hv] flex items-center bg-tea justify-center py-12 xl-py-0 text-yellow'
    >
      <div className='container mx-auto'>
        <Tabs 
          defaultValue='experience' 
          className='flex flex-col xl:flex-row gap-[60px]'
          >
          <TabsList className='flex flex-col w-full max-w-[380px] mx-auto xl:mx-0 gap-6'>
            <TabsTrigger value='experience'>Experience</TabsTrigger>
            <TabsTrigger value='education'>Education</TabsTrigger>
            <TabsTrigger value='skills'>Skills</TabsTrigger>
            <TabsTrigger value='about'>About Me</TabsTrigger>
          </TabsList>

          {/* Content */}
          <div>
            {/* Experience */}
            <TabsContent value='experience' className='w-full'>
              <div className='flex flex-col gap-[30px] text-center xl:text-left'>
                <h3 className='text-4xl font-bold'>
                  {experience.title}
                </h3>
                <p className='max-w-[600px] text-white/60 mx-auto xl:mx-0'>
                  {experience.description}
                </p>
                <ScrollArea className='h-[400px]'>
                  <ul className='grid grid-cols-1 lg:grid-cols-2 gap-[30px]'>
                    {experience.items.map(( item, index) => {
                      return <li key={index} className='bg-[#232329] h-[184px] py-6 px-10 rounded-xl flex flex-col justify-center items-center lg:items-start gap-1'>
                        <span>{item.duration}</span>
                        <h3 className='text-xl max-w-[260px] min-h-[60px] text-center lg:text-left'>
                          {item.position}
                        </h3>
                        <div className='flex flex-row items-center'>
                          <FaDotCircle className='text-accent text-sm mr-[5px]'/>
                          <p className='text-white/60'>
                            {item.company}
                          </p>
                        </div>
                      </li>
                    })}
                  </ul>
                </ScrollArea>
              </div>
            </TabsContent>
            {/* Education */}
            <TabsContent value='education' className='w-full'>
            <div className='flex flex-col gap-[30px] text-center xl:text-left'>
                <h3 className='text-4xl font-bold'>
                  {education.title}
                </h3>
                <p className='max-w-[600px] text-white/60 mx-auto xl:mx-0'>
                  {education.description}
                </p>
                <ScrollArea className='h-[400px]'>
                  <ul className='grid grid-cols-1 lg:grid-cols-2 gap-[30px]'>
                    {education.items.map(( item, index) => {
                      return <li key={index} className='bg-[#232329] h-[184px] py-6 px-10 rounded-xl flex flex-col justify-center items-center lg:items-start gap-1'>
                        <span>{item.duration}</span>
                        <h3 className='text-xl max-w-[260px] min-h-[60px] text-center lg:text-left'>
                          {item.degree}
                        </h3>
                        <div>
                          <span className='w-[6px] h-[6px] rounded-full bg-accent'></span>
                          <p className='text-white/60'>
                            {item.institution}
                          </p>
                        </div>
                      </li>
                    })}
                  </ul>
                </ScrollArea>
            </div>
            </TabsContent>
            {/* Skills */}
            <TabsContent value='skills' className='w-full h-full'>
              <div className='flex flex-col gap-[30px'>
                <div className='flex flex-col gap-[30px] text-center xl:text-left bg-primary mb-5'>
                  <h3 className='text-4xl font-bold'>
                    {skills.title}
                  </h3>
                  <p className='max-w-[600px] text-white/60 mx-auto xl:mx-0'>
                    {skills.description}
                  </p>
                </div>
                <ScrollArea className='h-[400px] px-3'>
                  <ul className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:gap-[30px]'>
                    {skills.items.map((skill, index) => {
                      return <li key={index} className='flex items-center gap-2'>
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger className='w-full mt-3 h-[125px] bg-[#232329] rounded-xl flex justify-center items-center group aspect-square'>
                              <div className={`text-6xl ${skill.color} transition-all duration-300`}>
                                {skill.icon}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className='capitalize'>
                                {skill.name}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </li>
                    })}
                  </ul>
                </ScrollArea>
              </div>
            </TabsContent>
            {/* About */}
            <TabsContent value='about' className='w-full text-center'>
              <div className='flex flex-col gap-[30px]'>
                  <h3 className='text-4xl font-bold'>{about.title}</h3>
                  <p className='max-w-[600px] text-white/60 mx-auto xl:mx-0'>
                    {about.description}
                  </p>
                  <ul className='grid grid-cols-1 xl:grid-cols-2 gap-y-6 max-w-[620px] mx-auto xl:mx-0'>
                    {about.info.map((item, index) => {
                      return (
                        <li 
                          key={index}
                          className='flex flex-row gap-2'
                        >
                          <span className='text-white/60'>
                            {item.fieldName}:
                          </span>
                          <span className='text-xl'>
                            {item.fieldValue}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
    </motion.div>
  )
}

export default Resume
