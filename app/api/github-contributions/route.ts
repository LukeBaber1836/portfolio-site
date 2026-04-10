import { NextResponse } from "next/server";

export async function GET() {
  const query = `
    query {
      user(login: "LukeBaber1836") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 },
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GitHub API errors:", data.errors);
      return NextResponse.json({ weeks: [] }, { status: 500 });
    }

    const weeks =
      data.data.user.contributionsCollection.contributionCalendar.weeks;

    return NextResponse.json({ weeks });
  } catch (error) {
    console.error("Error fetching GitHub contributions:", error);
    return NextResponse.json({ weeks: [] }, { status: 500 });
  }
}
