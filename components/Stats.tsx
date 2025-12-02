"use client";

import React, { useState, useEffect } from "react";
import CountUp from "react-countup";

const calculateYears = (startDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  return diffYears;
};

const Stats = () => {
  const [totalCommits, setTotalCommits] = useState(500); // Default fallback

  useEffect(() => {
    // Fetch GitHub commit count from API
    fetch("/api/github-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.commits) {
          setTotalCommits(data.commits);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch GitHub stats:", error);
        // Keep fallback value
      });
  }, []);

  const stats = [
    {
      num: calculateYears("2023-07-01"),
      text: "Years of Experience",
    },
    {
      num: 3,
      text: "Projects completed",
    },
    {
      num: 26,
      text: "Proven skills",
    },
    {
      num: totalCommits + 80, // Additional commits from Bryan Hess
      text: "Code commits",
    },
  ];

  return (
    <section className="pt-4 pb-12 xl:pt-0 xl:pb-0">
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-6 max-w-[80vw] mx-auto xl:max-w-none">
          {stats.map((item, index) => {
            return (
              <div
                className="flex-1 flex gap-4 items-center justify-center xl:justify-start"
                key={index}
              >
                <CountUp
                  end={item.num}
                  duration={5}
                  delay={2}
                  className="text-4xl md:text-6xl font-extrabold"
                />
                <p
                  className={`${
                    item.text.length < 15 ? "max-w-[100px]" : "max-w-[150px]"
                  } leading-snug text-white/80`}
                >
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;
