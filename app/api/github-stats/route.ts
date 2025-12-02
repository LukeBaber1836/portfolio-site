import { NextResponse } from 'next/server';

export async function GET() {
  const query = `
    query {
      user(login: "LukeBaber1836") {
        contributionsCollection {
          totalCommitContributions
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GitHub API errors:', data.errors);
      return NextResponse.json({ commits: 500 }, { status: 500 });
    }

    const commits = data.data.user.contributionsCollection.totalCommitContributions;

    return NextResponse.json({ commits });
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    return NextResponse.json({ commits: 500 }, { status: 500 });
  }
}
