import React from "react";
import Link from "next/link";

import Nav from "./Nav";
import MobileNav from "./MobileNav";
import HeaderAuthButton from "./HeaderAuthButton";

const Header = () => {
  return (
    <header className="py-8 xl:py-12 text-white">
      <div className="container mx-auto flex justify-between items-center">
        {/* logo */}
        <Link href="/">
          <h1 className="text-4xl font-semibold">
            Luke<span className="text-accent">.</span>
          </h1>
        </Link>
        {/* Desktop nav & login button */}
        <div className="hidden xl:flex items-center gap-8">
          <Nav />
          <HeaderAuthButton />
        </div>

        {/* Mobile nav */}
        <div className="xl:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

export default Header;
