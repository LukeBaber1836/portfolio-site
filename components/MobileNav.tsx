'use client';

import React, { useState } from 'react'

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CiMenuFries } from 'react-icons/ci'
import HeaderAuthButton from './HeaderAuthButton'

const links = [
    {
        name: 'home',
        path: '/'
    },
    {
        name: 'services',
        path: '/services'
    },
    {
        name: 'resume',
        path: '/resume'
    },
    {
        name: 'work',
        path: '/work'
    },
    {
        name: 'contact',
        path: '/contact'
    }
]

const MobileNav = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label='Open menu' className='flex justify-center items-center'>
        <CiMenuFries className='text-[32px] text-accent'/>
      </SheetTrigger>
      {/* h-dvh tracks the visible viewport (mobile browser bars), and the panel scrolls
          if its content is ever taller, so the login button is always reachable. */}
      <SheetContent
        className='flex h-dvh flex-col overflow-y-auto overscroll-contain px-6 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))]'
        // Close after any link tap (including the current page, which wouldn't change the route).
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) setOpen(false)
        }}
      >
        <SheetTitle className='sr-only'>
          Menu
        </SheetTitle>
        {/* logo */}
        <div className='shrink-0 pt-[6vh] text-center'>
          <Link href='/'>
              <span className='text-4xl font-semibold'>
                  Luke<span className='text-accent'>.</span>
              </span>
          </Link>
        </div>
        {/* nav */}
        <nav className='my-auto flex shrink-0 flex-col items-center justify-center gap-7 py-10'>
          {links.map((link, index)=> {
              return (
                  <Link
                      key={index}
                      href={link.path}
                      className={`${link.path === pathname && "text-accent border-b-2 border-accent"} text-xl capitalize font-medium hover:text-accent transition-all`}
                  >
                      {link.name}
                  </Link>
              )
          })}
        </nav>
        <div className='flex shrink-0 justify-center'>
          <HeaderAuthButton className='w-full max-w-48' />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav
