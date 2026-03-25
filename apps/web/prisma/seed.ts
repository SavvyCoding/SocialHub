import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clean existing data (reverse FK order)
  await db.endorsement.deleteMany()
  await db.userSkill.deleteMany()
  await db.skill.deleteMany()
  await db.storyView.deleteMany()
  await db.story.deleteMany()
  await db.notification.deleteMany()
  await db.friendRequest.deleteMany()
  await db.follow.deleteMany()
  await db.goal.deleteMany()
  await db.place.deleteMany()
  await db.movieEntry.deleteMany()
  await db.bookEntry.deleteMany()
  await db.education.deleteMany()
  await db.experience.deleteMany()
  await db.like.deleteMany()
  await db.comment.deleteMany()
  await db.post.deleteMany()
  await db.user.deleteMany()

  // ─── Users ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Password1", 12)

  const alice = await db.user.create({
    data: {
      name: "Alice Johnson",
      username: "alice",
      email: "alice@example.com",
      passwordHash,
      bio: "Building things on the internet. Love books and travel. Currently obsessed with TypeScript.",
      location: "San Francisco, CA",
      website: "https://alice.dev",
      isVerified: true,
    },
  })

  const bob = await db.user.create({
    data: {
      name: "Bob Smith",
      username: "bob",
      email: "bob@example.com",
      passwordHash,
      bio: "Software engineer & film enthusiast. I watch too many movies and eat too much pizza.",
      location: "New York, NY",
      website: "https://bobsmith.io",
    },
  })

  const carol = await db.user.create({
    data: {
      name: "Carol Williams",
      username: "carol",
      email: "carol@example.com",
      passwordHash,
      bio: "Wanderer. Reader. Coffee addict. Collecting passport stamps since 2015.",
      location: "Austin, TX",
    },
  })

  // ─── Posts ────────────────────────────────────────────────────
  const posts = await Promise.all([
    db.post.create({ data: { authorId: alice.id, content: "Just launched my new project! Excited to share what I've been building. #buildinpublic #webdev", visibility: "PUBLIC" } }),
    db.post.create({ data: { authorId: alice.id, content: "Reading 'The Pragmatic Programmer' for the third time. Still finding new things each read. What's your favorite tech book? 📚", visibility: "PUBLIC" } }),
    db.post.create({ data: { authorId: bob.id, content: "Watched Oppenheimer last night. Absolutely stunning cinematography. Christopher Nolan at his best. 🎬", visibility: "PUBLIC" } }),
    db.post.create({ data: { authorId: carol.id, content: "Just got back from Tokyo! The food, the culture, the people — absolutely incredible. Already planning my next trip. 🗾", visibility: "PUBLIC" } }),
    db.post.create({ data: { authorId: bob.id, content: "Hot take: TypeScript makes you a better JavaScript developer even if you never write a type annotation.", visibility: "PUBLIC" } }),
  ])

  await db.like.createMany({
    data: [
      { userId: bob.id, postId: posts[0].id },
      { userId: carol.id, postId: posts[0].id },
      { userId: alice.id, postId: posts[2].id },
      { userId: carol.id, postId: posts[4].id },
    ],
  })

  // ─── Follows ──────────────────────────────────────────────────
  await db.follow.createMany({
    data: [
      { followerId: bob.id, followingId: alice.id },
      { followerId: carol.id, followingId: alice.id },
      { followerId: alice.id, followingId: bob.id },
      { followerId: carol.id, followingId: bob.id },
      { followerId: alice.id, followingId: carol.id },
    ],
  })

  // ─── Experience ───────────────────────────────────────────────
  await db.experience.createMany({
    data: [
      { userId: alice.id, title: "Senior Frontend Engineer", company: "Vercel", location: "Remote", startDate: new Date("2022-03-01"), isCurrent: true, description: "Building the Next.js ecosystem and DX tooling." },
      { userId: alice.id, title: "Software Engineer", company: "Stripe", location: "San Francisco, CA", startDate: new Date("2019-06-01"), endDate: new Date("2022-02-28"), isCurrent: false, description: "Worked on the Stripe Dashboard and payments API." },
      { userId: bob.id, title: "Full-Stack Engineer", company: "Netflix", location: "Los Gatos, CA", startDate: new Date("2021-01-01"), isCurrent: true, description: "Building the content delivery pipeline and streaming UI." },
      { userId: bob.id, title: "Backend Developer", company: "Spotify", location: "New York, NY", startDate: new Date("2018-07-01"), endDate: new Date("2020-12-31"), isCurrent: false, description: "Microservices for the music recommendation engine." },
      { userId: carol.id, title: "Product Designer", company: "Airbnb", location: "Remote", startDate: new Date("2020-09-01"), isCurrent: true, description: "Designing travel experiences that delight hosts and guests." },
      { userId: carol.id, title: "UX Designer", company: "TripAdvisor", location: "Austin, TX", startDate: new Date("2017-04-01"), endDate: new Date("2020-08-31"), isCurrent: false, description: "Led UX for the mobile app redesign." },
    ],
  })

  // ─── Education ────────────────────────────────────────────────
  await db.education.createMany({
    data: [
      { userId: alice.id, school: "MIT", degree: "B.S.", field: "Computer Science", startYear: 2015, endYear: 2019 },
      { userId: bob.id, school: "Carnegie Mellon University", degree: "B.S.", field: "Software Engineering", startYear: 2014, endYear: 2018 },
      { userId: carol.id, school: "UT Austin", degree: "B.F.A.", field: "Interaction Design", startYear: 2013, endYear: 2017 },
    ],
  })

  // ─── Skills ───────────────────────────────────────────────────
  const skillNames = ["TypeScript", "React", "Node.js", "PostgreSQL", "Product Design", "Figma", "System Design", "GraphQL", "Python", "Leadership"]
  const skillMap: Record<string, string> = {}
  for (const name of skillNames) {
    const s = await db.skill.create({ data: { name } })
    skillMap[name] = s.id
  }

  const aliceSkills = ["TypeScript", "React", "Node.js", "System Design", "GraphQL"]
  const bobSkills = ["TypeScript", "Node.js", "PostgreSQL", "Python", "System Design"]
  const carolSkills = ["Product Design", "Figma", "React", "Leadership", "Python"]

  for (const name of aliceSkills) {
    await db.userSkill.create({ data: { userId: alice.id, skillId: skillMap[name] } })
  }
  for (const name of bobSkills) {
    await db.userSkill.create({ data: { userId: bob.id, skillId: skillMap[name] } })
  }
  for (const name of carolSkills) {
    await db.userSkill.create({ data: { userId: carol.id, skillId: skillMap[name] } })
  }

  // ─── Books (10 per user) ──────────────────────────────────────
  await db.bookEntry.createMany({
    data: [
      // Alice — tech, sci-fi, non-fiction
      { userId: alice.id, olWorkId: "OL82563W", title: "The Pragmatic Programmer", author: "David Thomas, Andrew Hunt", publishYear: 1999, status: "READ", rating: 5, review: "Changed how I think about software craftsmanship. Re-read every few years.", finishedAt: new Date("2024-01-10") },
      { userId: alice.id, olWorkId: "OL28726W", title: "Clean Code", author: "Robert C. Martin", publishYear: 2008, status: "READ", rating: 4, review: "Great fundamentals, though some examples feel dated.", finishedAt: new Date("2023-06-20") },
      { userId: alice.id, olWorkId: "OL17930368W", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", publishYear: 2017, status: "READ", rating: 5, review: "The best book on distributed systems I've ever read. Dense but worth it.", finishedAt: new Date("2023-11-15") },
      { userId: alice.id, olWorkId: "OL45804W", title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", publishYear: 1979, status: "READ", rating: 5, review: "42.", finishedAt: new Date("2022-08-01") },
      { userId: alice.id, olWorkId: "OL36180W", title: "Dune", author: "Frank Herbert", publishYear: 1965, status: "READ", rating: 5, review: "A masterpiece of worldbuilding. Nothing else comes close.", finishedAt: new Date("2023-03-14") },
      { userId: alice.id, olWorkId: "OL7417749W", title: "The Staff Engineer's Path", author: "Tanya Reilly", publishYear: 2022, status: "READING", startedAt: new Date("2025-01-01") },
      { userId: alice.id, olWorkId: "OL10284458W", title: "An Elegant Puzzle", author: "Will Larson", publishYear: 2019, status: "WANT_TO_READ" },
      { userId: alice.id, olWorkId: "OL83641W", title: "Atomic Habits", author: "James Clear", publishYear: 2018, status: "READ", rating: 4, review: "Practical and immediately applicable. The 1% better concept sticks.", finishedAt: new Date("2022-12-30") },
      { userId: alice.id, olWorkId: "OL27258W", title: "Project Hail Mary", author: "Andy Weir", publishYear: 2021, status: "READ", rating: 5, review: "Best sci-fi I've read in years. Read it blind — no spoilers!", finishedAt: new Date("2024-03-22") },
      { userId: alice.id, olWorkId: "OL27895W", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", publishYear: 2011, status: "WANT_TO_READ" },

      // Bob — film history, software, thrillers
      { userId: bob.id, olWorkId: "OL17595548W", title: "The Art of Dramatic Writing", author: "Lajos Egri", publishYear: 1946, status: "READ", rating: 5, review: "If you want to understand story structure, start here.", finishedAt: new Date("2023-04-10") },
      { userId: bob.id, olWorkId: "OL18149W", title: "Story", author: "Robert McKee", publishYear: 1997, status: "READ", rating: 4, review: "The definitive guide to screenplay structure.", finishedAt: new Date("2023-07-15") },
      { userId: bob.id, olWorkId: "OL82563W", title: "The Pragmatic Programmer", author: "David Thomas, Andrew Hunt", publishYear: 1999, status: "READ", rating: 4, review: "Essential reading for any developer.", finishedAt: new Date("2022-09-01") },
      { userId: bob.id, olWorkId: "OL45890W", title: "Ready Player One", author: "Ernest Cline", publishYear: 2011, status: "READ", rating: 3, review: "Fun nostalgia trip but thin on character depth.", finishedAt: new Date("2022-05-20") },
      { userId: bob.id, olWorkId: "OL27258W", title: "Project Hail Mary", author: "Andy Weir", publishYear: 2021, status: "READ", rating: 5, review: "Absolutely loved it. Rocky is the best character ever.", finishedAt: new Date("2023-11-01") },
      { userId: bob.id, olWorkId: "OL7353617W", title: "The Dark Knight Returns", author: "Frank Miller", publishYear: 1986, status: "READ", rating: 5, review: "Redefined what superhero stories could be.", finishedAt: new Date("2021-12-15") },
      { userId: bob.id, olWorkId: "OL27895W", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", publishYear: 2011, status: "READING", startedAt: new Date("2025-02-01") },
      { userId: bob.id, olWorkId: "OL36180W", title: "Dune", author: "Frank Herbert", publishYear: 1965, status: "READ", rating: 4, review: "Watched the film first which made reading interesting.", finishedAt: new Date("2024-01-25") },
      { userId: bob.id, olWorkId: "OL10284458W", title: "An Elegant Puzzle", author: "Will Larson", publishYear: 2019, status: "WANT_TO_READ" },
      { userId: bob.id, olWorkId: "OL8346234W", title: "No Longer Human", author: "Osamu Dazai", publishYear: 1948, status: "READ", rating: 4, review: "Haunting. Hard to shake after you've read it.", finishedAt: new Date("2024-06-10") },

      // Carol — travel, literature, design
      { userId: carol.id, olWorkId: "OL8230W", title: "Eat, Pray, Love", author: "Elizabeth Gilbert", publishYear: 2006, status: "READ", rating: 4, review: "The book that started my love of travel memoirs.", finishedAt: new Date("2018-05-10") },
      { userId: carol.id, olWorkId: "OL45804W", title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", publishYear: 1979, status: "READ", rating: 5, review: "Comfort re-read every year.", finishedAt: new Date("2024-12-28") },
      { userId: carol.id, olWorkId: "OL26682W", title: "In Patagonia", author: "Bruce Chatwin", publishYear: 1977, status: "READ", rating: 5, review: "Made me book a flight to Argentina. Poetic travel writing.", finishedAt: new Date("2023-09-05") },
      { userId: carol.id, olWorkId: "OL82563W", title: "The Pragmatic Programmer", author: "David Thomas, Andrew Hunt", publishYear: 1999, status: "DID_NOT_FINISH", review: "Not my genre but tried it for the team book club." },
      { userId: carol.id, olWorkId: "OL83641W", title: "Atomic Habits", author: "James Clear", publishYear: 2018, status: "READ", rating: 5, review: "Applied the habit stacking concept to my travel planning immediately.", finishedAt: new Date("2023-01-20") },
      { userId: carol.id, olWorkId: "OL36180W", title: "Dune", author: "Frank Herbert", publishYear: 1965, status: "WANT_TO_READ" },
      { userId: carol.id, olWorkId: "OL7417749W", title: "The Staff Engineer's Path", author: "Tanya Reilly", publishYear: 2022, status: "WANT_TO_READ" },
      { userId: carol.id, olWorkId: "OL17930368W", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", publishYear: 2017, status: "WANT_TO_READ" },
      { userId: carol.id, olWorkId: "OL9245868W", title: "The Creative Act", author: "Rick Rubin", publishYear: 2023, status: "READ", rating: 5, review: "Changed how I approach every design project.", finishedAt: new Date("2024-02-14") },
      { userId: carol.id, olWorkId: "OL27258W", title: "Project Hail Mary", author: "Andy Weir", publishYear: 2021, status: "READING", startedAt: new Date("2025-01-15") },

      // ── Alice extra 24 ──────────────────────────────────────────
      { userId: alice.id, olWorkId: "OL2612082W", title: "The Mythical Man-Month", author: "Frederick P. Brooks Jr.", publishYear: 1975, status: "READ", rating: 4, review: "Required reading for understanding why software projects fail.", finishedAt: new Date("2020-05-10") },
      { userId: alice.id, olWorkId: "OL17978067W", title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", publishYear: 2011, status: "READ", rating: 5, review: "Perspective-shifting. Made me rethink everything I thought I knew.", finishedAt: new Date("2023-08-20") },
      { userId: alice.id, olWorkId: "OL26384150W", title: "Homo Deus", author: "Yuval Noah Harari", publishYear: 2015, status: "READ", rating: 4, review: "Terrifying but fascinating look at humanity's future.", finishedAt: new Date("2023-09-15") },
      { userId: alice.id, olWorkId: "OL21677765W", title: "Shoe Dog", author: "Phil Knight", publishYear: 2016, status: "READ", rating: 5, review: "The Nike origin story is wild. Couldn't put it down.", finishedAt: new Date("2023-05-01") },
      { userId: alice.id, olWorkId: "OL21177749W", title: "Educated", author: "Tara Westover", publishYear: 2018, status: "READ", rating: 5, review: "Heartbreaking and inspiring in equal measure. One of the best memoirs.", finishedAt: new Date("2024-07-10") },
      { userId: alice.id, olWorkId: "OL29456927W", title: "The Psychology of Money", author: "Morgan Housel", publishYear: 2020, status: "READ", rating: 5, review: "Changed how I think about saving and compounding. Read it twice.", finishedAt: new Date("2022-03-15") },
      { userId: alice.id, olWorkId: "OL1150953W", title: "Ender's Game", author: "Orson Scott Card", publishYear: 1985, status: "READ", rating: 5, review: "Still the best sci-fi I read as a teenager. Holds up perfectly.", finishedAt: new Date("2021-06-10") },
      { userId: alice.id, olWorkId: "OL10634312W", title: "Foundation", author: "Isaac Asimov", publishYear: 1951, status: "READ", rating: 5, review: "The scope of Asimov's galaxy-spanning saga is unmatched.", finishedAt: new Date("2022-01-20") },
      { userId: alice.id, olWorkId: "OL7174879W", title: "Snow Crash", author: "Neal Stephenson", publishYear: 1992, status: "READ", rating: 4, review: "Invented the metaverse concept. Decades ahead of its time.", finishedAt: new Date("2024-09-20") },
      { userId: alice.id, olWorkId: "OL3493987W", title: "Neuromancer", author: "William Gibson", publishYear: 1984, status: "READ", rating: 4, review: "Dense but brilliant. Gibson invented cyberpunk.", finishedAt: new Date("2023-12-10") },
      { userId: alice.id, olWorkId: "OL26360899W", title: "The Phoenix Project", author: "Gene Kim, Kevin Behr, George Spafford", publishYear: 2013, status: "READ", rating: 4, review: "Best DevOps book disguised as a novel. Assigned it to my whole team.", finishedAt: new Date("2022-07-15") },
      { userId: alice.id, olWorkId: "OL28283989W", title: "Team Topologies", author: "Matthew Skelton, Manuel Pais", publishYear: 2019, status: "READ", rating: 4, review: "Revolutionized how I think about team structure.", finishedAt: new Date("2024-04-10") },
      { userId: alice.id, olWorkId: "OL21045567W", title: "Deep Work", author: "Cal Newport", publishYear: 2016, status: "READ", rating: 4, review: "Convinced me to do my hardest work first thing in the morning.", finishedAt: new Date("2023-07-01") },
      { userId: alice.id, olWorkId: "OL17645932W", title: "The Effective Engineer", author: "Edmond Lau", publishYear: 2015, status: "READ", rating: 5, review: "Shifted my mindset from output to leverage. Every engineer needs this.", finishedAt: new Date("2024-02-20") },
      { userId: alice.id, olWorkId: "OL17860744W", title: "Zero to One", author: "Peter Thiel", publishYear: 2014, status: "READ", rating: 3, review: "Some contrarian takes that stick with you, even if you disagree.", finishedAt: new Date("2022-10-15") },
      { userId: alice.id, olWorkId: "OL15842016W", title: "The Lean Startup", author: "Eric Ries", publishYear: 2011, status: "READ", rating: 4, review: "Shaped how I think about product iteration and validated learning.", finishedAt: new Date("2021-11-20") },
      { userId: alice.id, olWorkId: "OL20556985W", title: "The Innovators", author: "Walter Isaacson", publishYear: 2014, status: "READ", rating: 5, review: "The untold history of computing. Fascinating characters throughout.", finishedAt: new Date("2022-11-05") },
      { userId: alice.id, olWorkId: "OL26302573W", title: "The Hard Thing About Hard Things", author: "Ben Horowitz", publishYear: 2014, status: "READ", rating: 4, review: "Most honest book about what it's really like to build a company.", finishedAt: new Date("2023-02-10") },
      { userId: alice.id, olWorkId: "OL6781197W", title: "The Name of the Wind", author: "Patrick Rothfuss", publishYear: 2007, status: "WANT_TO_READ" },
      { userId: alice.id, olWorkId: "OL3532650W", title: "The Algorithm Design Manual", author: "Steven S. Skiena", publishYear: 1997, status: "READ", rating: 4, review: "My go-to reference for algorithm interview prep.", finishedAt: new Date("2019-09-01") },
      { userId: alice.id, olWorkId: "OL29006942W", title: "Software Engineering at Google", author: "Titus Winters, Tom Manshreck, Hyrum Wright", publishYear: 2020, status: "READING", startedAt: new Date("2025-01-10") },
      { userId: alice.id, olWorkId: "OL7353985W", title: "Structure and Interpretation of Computer Programs", author: "Harold Abelson, Gerald Jay Sussman", publishYear: 1984, status: "WANT_TO_READ" },
      { userId: alice.id, olWorkId: "OL1993848W", title: "Gödel, Escher, Bach", author: "Douglas R. Hofstadter", publishYear: 1979, status: "WANT_TO_READ" },
      { userId: alice.id, olWorkId: "OL15842015W", title: "The Power of Now", author: "Eckhart Tolle", publishYear: 1997, status: "READ", rating: 4, review: "Life-changing perspective on presence. Best paired with meditation practice.", finishedAt: new Date("2022-06-01") },

      // ── Bob extra 24 ────────────────────────────────────────────
      { userId: bob.id, olWorkId: "OL7594847W", title: "Easy Riders, Raging Bulls", author: "Peter Biskind", publishYear: 1998, status: "READ", rating: 5, review: "The definitive account of New Hollywood. Insane stories on every page.", finishedAt: new Date("2022-02-15") },
      { userId: bob.id, olWorkId: "OL8107835W", title: "Adventures in the Screen Trade", author: "William Goldman", publishYear: 1983, status: "READ", rating: 5, review: "'Nobody knows anything.' The most honest Hollywood memoir ever written.", finishedAt: new Date("2021-08-20") },
      { userId: bob.id, olWorkId: "OL30745W", title: "On Writing", author: "Stephen King", publishYear: 2000, status: "READ", rating: 5, review: "Half memoir, half craft manual. Best book on writing I've ever read.", finishedAt: new Date("2023-03-05") },
      { userId: bob.id, olWorkId: "OL12023186W", title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", publishYear: 2005, status: "READ", rating: 4, review: "Gripping thriller. Lisbeth Salander is one of fiction's great characters.", finishedAt: new Date("2022-04-10") },
      { userId: bob.id, olWorkId: "OL17026380W", title: "Gone Girl", author: "Gillian Flynn", publishYear: 2012, status: "READ", rating: 4, review: "That twist. I put the book down and stared at the wall for five minutes.", finishedAt: new Date("2022-08-30") },
      { userId: bob.id, olWorkId: "OL81385W", title: "The Shining", author: "Stephen King", publishYear: 1977, status: "READ", rating: 4, review: "Scarier than the Kubrick film. And that's saying something.", finishedAt: new Date("2023-10-31") },
      { userId: bob.id, olWorkId: "OL1168007W", title: "1984", author: "George Orwell", publishYear: 1949, status: "READ", rating: 5, review: "More relevant every year that passes. Terrifyingly prescient.", finishedAt: new Date("2021-04-15") },
      { userId: bob.id, olWorkId: "OL94938W", title: "Brave New World", author: "Aldous Huxley", publishYear: 1932, status: "READ", rating: 4, review: "The dystopia we actually chose. Scarier than 1984 in hindsight.", finishedAt: new Date("2021-05-20") },
      { userId: bob.id, olWorkId: "OL98227W", title: "Fahrenheit 451", author: "Ray Bradbury", publishYear: 1953, status: "READ", rating: 4, review: "Haunting and beautiful. The ending still hits me hard.", finishedAt: new Date("2022-03-01") },
      { userId: bob.id, olWorkId: "OL7331751W", title: "The Catcher in the Rye", author: "J.D. Salinger", publishYear: 1951, status: "READ", rating: 3, review: "I get why it's a classic. Holden just exhausted me.", finishedAt: new Date("2020-11-10") },
      { userId: bob.id, olWorkId: "OL5996903W", title: "The Great Gatsby", author: "F. Scott Fitzgerald", publishYear: 1925, status: "READ", rating: 4, review: "Perfect prose. Captures something timeless about the American dream.", finishedAt: new Date("2020-09-15") },
      { userId: bob.id, olWorkId: "OL6882285W", title: "Man's Search for Meaning", author: "Viktor E. Frankl", publishYear: 1946, status: "READ", rating: 5, review: "The most important book I've ever read. Full stop.", finishedAt: new Date("2022-12-01") },
      { userId: bob.id, olWorkId: "OL41100W", title: "Crime and Punishment", author: "Fyodor Dostoevsky", publishYear: 1866, status: "READ", rating: 5, review: "Psychological depth that modern thrillers can only dream of.", finishedAt: new Date("2023-01-30") },
      { userId: bob.id, olWorkId: "OL49018W", title: "The Brothers Karamazov", author: "Fyodor Dostoevsky", publishYear: 1880, status: "READING", startedAt: new Date("2025-01-01") },
      { userId: bob.id, olWorkId: "OL51000W", title: "The Idiot", author: "Fyodor Dostoevsky", publishYear: 1869, status: "READ", rating: 4, review: "Prince Myshkin is one of literature's most fascinating characters.", finishedAt: new Date("2024-08-15") },
      { userId: bob.id, olWorkId: "OL81843W", title: "Thus Spoke Zarathustra", author: "Friedrich Nietzsche", publishYear: 1883, status: "READ", rating: 3, review: "Dense and provocative. The Übermensch concept is often misunderstood.", finishedAt: new Date("2024-10-10") },
      { userId: bob.id, olWorkId: "OL17978067W", title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", publishYear: 2011, status: "READ", rating: 4, review: "The Agricultural Revolution section changed how I see history.", finishedAt: new Date("2024-03-20") },
      { userId: bob.id, olWorkId: "OL8081757W", title: "Freakonomics", author: "Steven D. Levitt, Stephen J. Dubner", publishYear: 2005, status: "READ", rating: 4, review: "Applies economics to unexpected problems. Endlessly thought-provoking.", finishedAt: new Date("2021-10-05") },
      { userId: bob.id, olWorkId: "OL7928922W", title: "Outliers", author: "Malcolm Gladwell", publishYear: 2008, status: "READ", rating: 4, review: "The 10,000-hour rule stuck with me. Even if it's been partially debunked.", finishedAt: new Date("2022-01-10") },
      { userId: bob.id, olWorkId: "OL20468438W", title: "The Power of Habit", author: "Charles Duhigg", publishYear: 2012, status: "READ", rating: 3, review: "Good framework for habit change but oversimplifies the psychology.", finishedAt: new Date("2023-05-15") },
      { userId: bob.id, olWorkId: "OL26474680W", title: "Hooked", author: "Nir Eyal", publishYear: 2013, status: "READ", rating: 3, review: "Useful for understanding product design psychology. Slightly unsettling.", finishedAt: new Date("2023-08-10") },
      { userId: bob.id, olWorkId: "OL98862W", title: "Walden", author: "Henry David Thoreau", publishYear: 1854, status: "READ", rating: 3, review: "Beautiful writing. Would be more compelling if Thoreau wasn't so smug.", finishedAt: new Date("2024-05-20") },
      { userId: bob.id, olWorkId: "OL45804W", title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", publishYear: 1979, status: "READ", rating: 5, review: "42. The only answer that matters.", finishedAt: new Date("2021-02-14") },
      { userId: bob.id, olWorkId: "OL18011226W", title: "Blood Meridian", author: "Cormac McCarthy", publishYear: 1985, status: "READ", rating: 4, review: "Brutal and poetic in equal measure. The Judge haunts my dreams.", finishedAt: new Date("2024-11-30") },

      // ── Carol extra 24 ──────────────────────────────────────────
      { userId: carol.id, olWorkId: "OL18049688W", title: "Wild", author: "Cheryl Strayed", publishYear: 2012, status: "READ", rating: 5, review: "Read it twice. Made me want to hike the PCT immediately.", finishedAt: new Date("2016-07-10") },
      { userId: carol.id, olWorkId: "OL10919680W", title: "The Alchemist", author: "Paulo Coelho", publishYear: 1988, status: "READ", rating: 5, review: "Read it before every big trip. Reminds me why I travel.", finishedAt: new Date("2015-03-01") },
      { userId: carol.id, olWorkId: "OL7353589W", title: "A Walk in the Woods", author: "Bill Bryson", publishYear: 1998, status: "READ", rating: 4, review: "Bryson makes you feel like you're on the trail with him. Hilarious.", finishedAt: new Date("2019-06-15") },
      { userId: carol.id, olWorkId: "OL9297024W", title: "In a Sunburned Country", author: "Bill Bryson", publishYear: 2000, status: "READ", rating: 4, review: "Now I need to go to Australia. Classic Bryson absurdity.", finishedAt: new Date("2021-02-20") },
      { userId: carol.id, olWorkId: "OL7975866W", title: "The Shadow of the Wind", author: "Carlos Ruiz Zafón", publishYear: 2001, status: "READ", rating: 5, review: "Atmospheric Barcelona gothic. Made me plan my Lisbon trip immediately.", finishedAt: new Date("2024-04-10") },
      { userId: carol.id, olWorkId: "OL45919W", title: "One Hundred Years of Solitude", author: "Gabriel García Márquez", publishYear: 1967, status: "READ", rating: 5, review: "Magical realism as a genre peaked here. The Buendía family is unforgettable.", finishedAt: new Date("2020-07-15") },
      { userId: carol.id, olWorkId: "OL7380266W", title: "Like Water for Chocolate", author: "Laura Esquivel", publishYear: 1989, status: "READ", rating: 4, review: "Food and emotion intertwined perfectly. Made me cook for a week straight.", finishedAt: new Date("2022-11-10") },
      { userId: carol.id, olWorkId: "OL7928949W", title: "The Kite Runner", author: "Khaled Hosseini", publishYear: 2003, status: "READ", rating: 5, review: "Cried on a plane reading this. Made me want to understand Afghanistan.", finishedAt: new Date("2019-11-01") },
      { userId: carol.id, olWorkId: "OL7928950W", title: "A Thousand Splendid Suns", author: "Khaled Hosseini", publishYear: 2007, status: "READ", rating: 5, review: "Even more devastating than The Kite Runner. Mariam and Laila stay with you.", finishedAt: new Date("2020-01-15") },
      { userId: carol.id, olWorkId: "OL21975124W", title: "Becoming", author: "Michelle Obama", publishYear: 2018, status: "READ", rating: 5, review: "Honest, warm, and inspiring. One of the best memoirs in years.", finishedAt: new Date("2019-03-20") },
      { userId: carol.id, olWorkId: "OL7922919W", title: "The Year of Magical Thinking", author: "Joan Didion", publishYear: 2005, status: "READ", rating: 4, review: "Raw and precise. Didion's grief writing is unlike anything else.", finishedAt: new Date("2023-02-14") },
      { userId: carol.id, olWorkId: "OL27002241W", title: "Big Magic", author: "Elizabeth Gilbert", publishYear: 2015, status: "READ", rating: 5, review: "Read it in one sitting. Finally gave me permission to make things imperfectly.", finishedAt: new Date("2022-09-20") },
      { userId: carol.id, olWorkId: "OL7353647W", title: "The Design of Everyday Things", author: "Don Norman", publishYear: 1988, status: "READ", rating: 5, review: "Every bad interface makes sense through Norman's lens. Changed how I design.", finishedAt: new Date("2018-11-05") },
      { userId: carol.id, olWorkId: "OL27197476W", title: "Sprint", author: "Jake Knapp, John Zeratsky, Braden Kowitz", publishYear: 2016, status: "READ", rating: 4, review: "Our team ran a sprint after reading this. Most productive week of the year.", finishedAt: new Date("2021-08-01") },
      { userId: carol.id, olWorkId: "OL7328197W", title: "The Elements of Typographic Style", author: "Robert Bringhurst", publishYear: 1992, status: "READ", rating: 5, review: "The bible of typography. I still refer back to it constantly.", finishedAt: new Date("2018-06-15") },
      { userId: carol.id, olWorkId: "OL24366148W", title: "Just My Type", author: "Simon Garfield", publishYear: 2010, status: "READ", rating: 4, review: "Made me obsessively notice fonts everywhere I go. A blessing and a curse.", finishedAt: new Date("2020-04-10") },
      { userId: carol.id, olWorkId: "OL9284993W", title: "Don't Make Me Think", author: "Steve Krug", publishYear: 2000, status: "READ", rating: 4, review: "Essential UX reading. The title is all you need to know.", finishedAt: new Date("2018-09-15") },
      { userId: carol.id, olWorkId: "OL7353581W", title: "Bird by Bird", author: "Anne Lamott", publishYear: 1994, status: "READ", rating: 4, review: "The shitty first draft advice freed me. Apply to every creative project.", finishedAt: new Date("2023-11-20") },
      { userId: carol.id, olWorkId: "OL7358026W", title: "The War of Art", author: "Steven Pressfield", publishYear: 2002, status: "READ", rating: 5, review: "Read it when I was procrastinating on a big design project. Finished the project.", finishedAt: new Date("2022-06-10") },
      { userId: carol.id, olWorkId: "OL98862W", title: "Walden", author: "Henry David Thoreau", publishYear: 1854, status: "READ", rating: 3, review: "Beautiful nature writing. Thoreau's philosophy resonates more on long hikes.", finishedAt: new Date("2024-08-01") },
      { userId: carol.id, olWorkId: "OL120680W", title: "Letters to a Young Poet", author: "Rainer Maria Rilke", publishYear: 1929, status: "READ", rating: 5, review: "Carry it everywhere. Open to a random letter when I need perspective.", finishedAt: new Date("2021-12-25") },
      { userId: carol.id, olWorkId: "OL7353591W", title: "The Artist's Way", author: "Julia Cameron", publishYear: 1992, status: "READ", rating: 4, review: "Did the morning pages for 12 weeks. Unlocked a creative block I'd had for years.", finishedAt: new Date("2023-07-31") },
      { userId: carol.id, olWorkId: "OL1168007W", title: "1984", author: "George Orwell", publishYear: 1949, status: "READ", rating: 4, review: "Reread it in 2024. Hits differently now.", finishedAt: new Date("2024-10-05") },
      { userId: carol.id, olWorkId: "OL26302573W", title: "The Hard Thing About Hard Things", author: "Ben Horowitz", publishYear: 2014, status: "WANT_TO_READ" },
    ],
  })

  // ─── Movies (10 per user) ─────────────────────────────────────
  await db.movieEntry.createMany({
    data: [
      // Alice — sci-fi, mind-benders, documentaries
      { userId: alice.id, tmdbId: 27205, mediaType: "MOVIE", title: "Inception", posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", releaseYear: 2010, status: "WATCHED", rating: 10, review: "The one that made me love Nolan. Watch it twice.", watchedAt: new Date("2023-05-10") },
      { userId: alice.id, tmdbId: 603, mediaType: "MOVIE", title: "The Matrix", posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", releaseYear: 1999, status: "WATCHED", rating: 10, review: "Still holds up 25 years later.", watchedAt: new Date("2022-09-01") },
      { userId: alice.id, tmdbId: 496243, mediaType: "MOVIE", title: "Parasite", posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", releaseYear: 2019, status: "WATCHED", rating: 9, review: "Genre-defying masterpiece. Bong Joon-ho is a genius.", watchedAt: new Date("2023-11-22") },
      { userId: alice.id, tmdbId: 872585, mediaType: "MOVIE", title: "Oppenheimer", posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", releaseYear: 2023, status: "WATCHED", rating: 9, review: "Cillian Murphy deserved that Oscar a decade ago.", watchedAt: new Date("2023-08-15") },
      { userId: alice.id, tmdbId: 105, mediaType: "MOVIE", title: "Back to the Future", posterUrl: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg", releaseYear: 1985, status: "WATCHED", rating: 9, watchedAt: new Date("2022-12-25") },
      { userId: alice.id, tmdbId: 1399, mediaType: "TV", title: "Game of Thrones", posterUrl: "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", releaseYear: 2011, status: "WATCHED", rating: 7, review: "Peak TV until season 7. Worth it for the first 6.", watchedAt: new Date("2023-02-28") },
      { userId: alice.id, tmdbId: 76479, mediaType: "TV", title: "The Boys", posterUrl: "https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg", releaseYear: 2019, status: "WATCHING" },
      { userId: alice.id, tmdbId: 157336, mediaType: "MOVIE", title: "Interstellar", posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", releaseYear: 2014, status: "WATCHED", rating: 10, review: "The docking scene. The corn fields. The ending. Perfect.", watchedAt: new Date("2024-01-05") },
      { userId: alice.id, tmdbId: 94997, mediaType: "TV", title: "Severance", posterUrl: "https://image.tmdb.org/t/p/w500/lkOxbSFiHF9AH10RbfVaY7BpuiQ.jpg", releaseYear: 2022, status: "WATCHED", rating: 10, review: "Season 2 was even better than season 1.", watchedAt: new Date("2025-01-28") },
      { userId: alice.id, tmdbId: 438631, mediaType: "MOVIE", title: "Dune", posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklpcvkn173Cf1gWwEbizGR.jpg", releaseYear: 2021, status: "WANT_TO_WATCH" },

      // Bob — film enthusiast, classics, blockbusters
      { userId: bob.id, tmdbId: 872585, mediaType: "MOVIE", title: "Oppenheimer", posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", releaseYear: 2023, status: "WATCHED", rating: 10, review: "The greatest film Nolan has ever made. Bar none.", watchedAt: new Date("2023-07-21") },
      { userId: bob.id, tmdbId: 238, mediaType: "MOVIE", title: "The Godfather", posterUrl: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLeMsiL086tD.jpg", releaseYear: 1972, status: "WATCHED", rating: 10, review: "The greatest film ever made. Full stop.", watchedAt: new Date("2021-03-10") },
      { userId: bob.id, tmdbId: 278, mediaType: "MOVIE", title: "The Shawshank Redemption", posterUrl: "https://image.tmdb.org/t/p/w500/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg", releaseYear: 1994, status: "WATCHED", rating: 10, review: "Every single time I watch it, I tear up at the same scenes.", watchedAt: new Date("2022-06-15") },
      { userId: bob.id, tmdbId: 424, mediaType: "MOVIE", title: "Schindler's List", posterUrl: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg", releaseYear: 1993, status: "WATCHED", rating: 10, review: "Cinema as testimony. Spielberg at his absolute peak.", watchedAt: new Date("2022-01-27") },
      { userId: bob.id, tmdbId: 496243, mediaType: "MOVIE", title: "Parasite", posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", releaseYear: 2019, status: "WATCHED", rating: 9, review: "Watched 4 times. Still finding new details.", watchedAt: new Date("2023-09-30") },
      { userId: bob.id, tmdbId: 27205, mediaType: "MOVIE", title: "Inception", posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", releaseYear: 2010, status: "WATCHED", rating: 9, review: "The totem scene haunts me.", watchedAt: new Date("2022-11-20") },
      { userId: bob.id, tmdbId: 1396, mediaType: "TV", title: "Breaking Bad", posterUrl: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", releaseYear: 2008, status: "WATCHED", rating: 10, review: "The best TV drama ever made. Ozymandias is perfect television.", watchedAt: new Date("2023-12-10") },
      { userId: bob.id, tmdbId: 197, mediaType: "MOVIE", title: "Braveheart", posterUrl: "https://image.tmdb.org/t/p/w500/or1gBugydmjToAEq7OZY0owwFk.jpg", releaseYear: 1995, status: "WATCHED", rating: 8, watchedAt: new Date("2021-07-04") },
      { userId: bob.id, tmdbId: 68718, mediaType: "MOVIE", title: "Django Unchained", posterUrl: "https://image.tmdb.org/t/p/w500/7oWY8VDWW7thTzWh3OKYRkWxoXd.jpg", releaseYear: 2012, status: "WATCHED", rating: 9, review: "Tarantino at his most entertaining.", watchedAt: new Date("2024-02-10") },
      { userId: bob.id, tmdbId: 438631, mediaType: "MOVIE", title: "Dune", posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklpcvkn173Cf1gWwEbizGR.jpg", releaseYear: 2021, status: "WATCHED", rating: 9, review: "Villeneuve is the new Kubrick.", watchedAt: new Date("2024-04-01") },

      // Carol — travel, adventure, feel-good
      { userId: carol.id, tmdbId: 12477, mediaType: "MOVIE", title: "Grave of the Fireflies", posterUrl: "https://image.tmdb.org/t/p/w500/k9tv1rXZbOhH7eiCk378x61kNQ1.jpg", releaseYear: 1988, status: "WATCHED", rating: 9, review: "Cried for an hour after. Do not watch alone.", watchedAt: new Date("2022-10-15") },
      { userId: carol.id, tmdbId: 129, mediaType: "MOVIE", title: "Spirited Away", posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", releaseYear: 2001, status: "WATCHED", rating: 10, review: "The film that made me fall in love with Japan. Hence the Tokyo trip.", watchedAt: new Date("2024-06-20") },
      { userId: carol.id, tmdbId: 10515, mediaType: "MOVIE", title: "Castle in the Sky", posterUrl: "https://image.tmdb.org/t/p/w500/npOnzAbLh6VOIu3naU5g3x0wW2M.jpg", releaseYear: 1986, status: "WATCHED", rating: 9, review: "Pure adventure and wonder.", watchedAt: new Date("2024-06-22") },
      { userId: carol.id, tmdbId: 496243, mediaType: "MOVIE", title: "Parasite", posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", releaseYear: 2019, status: "WATCHED", rating: 9, review: "Watching this made me research Korean culture for a week.", watchedAt: new Date("2023-08-10") },
      { userId: carol.id, tmdbId: 38757, mediaType: "MOVIE", title: "Into the Wild", posterUrl: "https://image.tmdb.org/t/p/w500/9M3TiH76qMp5Cj0ybLMYJ5lGWh0.jpg", releaseYear: 2007, status: "WATCHED", rating: 9, review: "This film changed my relationship with travel. RIP Chris.", watchedAt: new Date("2019-03-15") },
      { userId: carol.id, tmdbId: 335983, mediaType: "MOVIE", title: "Venom", posterUrl: "https://image.tmdb.org/t/p/w500/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg", releaseYear: 2018, status: "WATCHED", rating: 6, review: "Watched it on a long flight. Surprisingly fun trash.", watchedAt: new Date("2023-11-05") },
      { userId: carol.id, tmdbId: 1396, mediaType: "TV", title: "Breaking Bad", posterUrl: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", releaseYear: 2008, status: "WATCHING" },
      { userId: carol.id, tmdbId: 60574, mediaType: "TV", title: "Peaky Blinders", posterUrl: "https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVn3agrC2ak.jpg", releaseYear: 2013, status: "WATCHED", rating: 9, review: "Thomas Shelby is one of the great TV characters.", watchedAt: new Date("2023-06-30") },
      { userId: carol.id, tmdbId: 94997, mediaType: "TV", title: "Severance", posterUrl: "https://image.tmdb.org/t/p/w500/lkOxbSFiHF9AH10RbfVaY7BpuiQ.jpg", releaseYear: 2022, status: "WANT_TO_WATCH" },
      { userId: carol.id, tmdbId: 157336, mediaType: "MOVIE", title: "Interstellar", posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", releaseYear: 2014, status: "WANT_TO_WATCH" },

      // ── Alice extra 24 ──────────────────────────────────────────
      { userId: alice.id, tmdbId: 62, mediaType: "MOVIE", title: "2001: A Space Odyssey", posterUrl: "https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg", releaseYear: 1968, status: "WATCHED", rating: 9, review: "Kubrick's masterpiece. The monolith scene still baffles me.", watchedAt: new Date("2022-05-10") },
      { userId: alice.id, tmdbId: 335984, mediaType: "MOVIE", title: "Blade Runner 2049", posterUrl: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg", releaseYear: 2017, status: "WATCHED", rating: 9, review: "Visually stunning. Deakins deserved every award.", watchedAt: new Date("2023-04-15") },
      { userId: alice.id, tmdbId: 264660, mediaType: "MOVIE", title: "Ex Machina", posterUrl: "https://image.tmdb.org/t/p/w500/btFuA1JJMpCQn1gEFDaOdpfzRCd.jpg", releaseYear: 2014, status: "WATCHED", rating: 9, review: "The most thought-provoking AI film ever made. Oscar Isaac is magnetic.", watchedAt: new Date("2023-09-20") },
      { userId: alice.id, tmdbId: 329865, mediaType: "MOVIE", title: "Arrival", posterUrl: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg", releaseYear: 2016, status: "WATCHED", rating: 10, review: "The ending destroyed me. Villeneuve's best film.", watchedAt: new Date("2024-05-01") },
      { userId: alice.id, tmdbId: 286217, mediaType: "MOVIE", title: "The Martian", posterUrl: "https://image.tmdb.org/t/p/w500/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg", releaseYear: 2015, status: "WATCHED", rating: 8, review: "Science-based problem solving as entertainment. Matt Damon at his best.", watchedAt: new Date("2022-11-15") },
      { userId: alice.id, tmdbId: 152601, mediaType: "MOVIE", title: "Her", posterUrl: "https://image.tmdb.org/t/p/w500/joypicMCQnEZ5EwGQ1vdZFVGsNs.jpg", releaseYear: 2013, status: "WATCHED", rating: 9, review: "Heartbreaking meditation on loneliness and AI. More relevant every year.", watchedAt: new Date("2024-02-10") },
      { userId: alice.id, tmdbId: 686, mediaType: "MOVIE", title: "Contact", posterUrl: "https://image.tmdb.org/t/p/w500/oeP07BfduvjSPFEjLTI0KOkFHyE.jpg", releaseYear: 1997, status: "WATCHED", rating: 9, review: "The best film about science and faith ever made.", watchedAt: new Date("2021-08-20") },
      { userId: alice.id, tmdbId: 42009, mediaType: "TV", title: "Black Mirror", posterUrl: "https://image.tmdb.org/t/p/w500/7PRddO7z7mcPi21nZTCMGShAyy1.jpg", releaseYear: 2011, status: "WATCHED", rating: 8, review: "Best anthology series ever. San Junipero is perfect television.", watchedAt: new Date("2023-03-10") },
      { userId: alice.id, tmdbId: 63247, mediaType: "TV", title: "Westworld", posterUrl: "https://image.tmdb.org/t/p/w500/8MfgyFHf7XEboZJPZXCIDqqiz6e.jpg", releaseYear: 2016, status: "WATCHED", rating: 7, review: "Season 1 is a masterpiece. Falls apart after but still worth it.", watchedAt: new Date("2023-06-15") },
      { userId: alice.id, tmdbId: 66732, mediaType: "TV", title: "Stranger Things", posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", releaseYear: 2016, status: "WATCHED", rating: 8, review: "Pure 80s nostalgia done right. Season 4 is legitimately great.", watchedAt: new Date("2022-07-05") },
      { userId: alice.id, tmdbId: 82856, mediaType: "TV", title: "The Mandalorian", posterUrl: "https://image.tmdb.org/t/p/w500/eU1i6eHXlzMqZCTFpMG0y8TFtD1.jpg", releaseYear: 2019, status: "WATCHING" },
      { userId: alice.id, tmdbId: 67879, mediaType: "TV", title: "Mindhunter", posterUrl: "https://image.tmdb.org/t/p/w500/epBHMq3j2B1Q7vKhFYRFmqQikXX.jpg", releaseYear: 2017, status: "WATCHED", rating: 9, review: "The BSK interviews are chilling. Ford and Tench have perfect chemistry.", watchedAt: new Date("2023-12-20") },
      { userId: alice.id, tmdbId: 70523, mediaType: "TV", title: "Dark", posterUrl: "https://image.tmdb.org/t/p/w500/apbrbWs5M9vulE7bFvbEW2VFgGhq.jpg", releaseYear: 2017, status: "WATCHED", rating: 10, review: "The most mind-bending show ever made. Needs a spreadsheet to follow.", watchedAt: new Date("2024-01-15") },
      { userId: alice.id, tmdbId: 62560, mediaType: "TV", title: "Mr. Robot", posterUrl: "https://image.tmdb.org/t/p/w500/dVSWY12LiKYWFfEDiW2CXWGiCDCm.jpg", releaseYear: 2015, status: "WATCHED", rating: 10, review: "The most technically accurate hacking show. Rami Malek is phenomenal.", watchedAt: new Date("2024-03-05") },
      { userId: alice.id, tmdbId: 37799, mediaType: "MOVIE", title: "The Social Network", posterUrl: "https://image.tmdb.org/t/p/w500/n0ybibhJtQ5icDqTp8eRytcIHso.jpg", releaseYear: 2010, status: "WATCHED", rating: 9, review: "Fincher's Citizen Kane of Silicon Valley. Sorkin's dialogue is electric.", watchedAt: new Date("2022-03-20") },
      { userId: alice.id, tmdbId: 205596, mediaType: "MOVIE", title: "The Imitation Game", posterUrl: "https://image.tmdb.org/t/p/w500/zSqJ1qFq8NXFfi7JeIYMlZPFWlO.jpg", releaseYear: 2014, status: "WATCHED", rating: 8, review: "Turing's story deserves to be better known. Cumberbatch is perfect.", watchedAt: new Date("2021-12-10") },
      { userId: alice.id, tmdbId: 60308, mediaType: "MOVIE", title: "Moneyball", posterUrl: "https://image.tmdb.org/t/p/w500/3oAa8mJJ97CH9AeGEY6vjAxqcvZ.jpg", releaseYear: 2011, status: "WATCHED", rating: 8, review: "Data-driven decision making as drama. Pitt is underrated here.", watchedAt: new Date("2023-07-20") },
      { userId: alice.id, tmdbId: 545611, mediaType: "MOVIE", title: "Everything Everywhere All at Once", posterUrl: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg", releaseYear: 2022, status: "WATCHED", rating: 10, review: "The most original film of the decade. Made me call my mom immediately.", watchedAt: new Date("2023-01-20") },
      { userId: alice.id, tmdbId: 693134, mediaType: "MOVIE", title: "Dune: Part Two", posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", releaseYear: 2024, status: "WATCHED", rating: 9, review: "Finally read the book first. The sandworm ride is everything.", watchedAt: new Date("2024-03-10") },
      { userId: alice.id, tmdbId: 55770, mediaType: "TV", title: "Silicon Valley", posterUrl: "https://image.tmdb.org/t/p/w500/9iDJPmxp5pOGPAB3bNugxNKSZuv.jpg", releaseYear: 2014, status: "WATCHED", rating: 8, review: "Uncomfortably accurate satire of tech culture. Richard Hendricks is me.", watchedAt: new Date("2022-08-05") },
      { userId: alice.id, tmdbId: 61889, mediaType: "TV", title: "Halt and Catch Fire", posterUrl: "https://image.tmdb.org/t/p/w500/k6uNGCTFkmHJaAtb3MknRllHFH6.jpg", releaseYear: 2014, status: "WATCHED", rating: 9, review: "The most underrated show about tech ever made. Cameron Howe is legendary.", watchedAt: new Date("2024-06-10") },
      { userId: alice.id, tmdbId: 835963, mediaType: "MOVIE", title: "BlackBerry", posterUrl: "https://image.tmdb.org/t/p/w500/2nv5lT2vjKg7ItXNyHcgRkLRzI7.jpg", releaseYear: 2023, status: "WATCHED", rating: 8, review: "Watched it in two sittings. The perfect tech rise-and-fall story.", watchedAt: new Date("2023-10-15") },
      { userId: alice.id, tmdbId: 17431, mediaType: "MOVIE", title: "Moon", posterUrl: "https://image.tmdb.org/t/p/w500/yXBKjMXaMKd8wIf3RW1ZnkXWREh.jpg", releaseYear: 2009, status: "WATCHED", rating: 8, review: "Sam Rockwell carrying an entire film. Quiet, thoughtful sci-fi.", watchedAt: new Date("2021-04-10") },
      { userId: alice.id, tmdbId: 95479, mediaType: "TV", title: "Station Eleven", posterUrl: "https://image.tmdb.org/t/p/w500/bUCJZaHMkBCdlg8JKQkKkHMXtQe.jpg", releaseYear: 2021, status: "WATCHED", rating: 9, review: "Post-apocalyptic show that's ultimately about hope. Profoundly moving.", watchedAt: new Date("2022-02-15") },

      // ── Bob extra 24 ────────────────────────────────────────────
      { userId: bob.id, tmdbId: 15, mediaType: "MOVIE", title: "Citizen Kane", posterUrl: "https://image.tmdb.org/t/p/w500/jqJiVJMJjfTHPUGwEI7WPrWPgEL.jpg", releaseYear: 1941, status: "WATCHED", rating: 8, review: "Technically revolutionary. The deep focus shots still amaze me.", watchedAt: new Date("2020-06-01") },
      { userId: bob.id, tmdbId: 289, mediaType: "MOVIE", title: "Casablanca", posterUrl: "https://image.tmdb.org/t/p/w500/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg", releaseYear: 1942, status: "WATCHED", rating: 9, review: "Every line of dialogue is quotable. Bogart is magnetic.", watchedAt: new Date("2020-07-15") },
      { userId: bob.id, tmdbId: 426, mediaType: "MOVIE", title: "Vertigo", posterUrl: "https://image.tmdb.org/t/p/w500/5Wb8SrWW3RMTEwsqBYOPjGEkP0P.jpg", releaseYear: 1958, status: "WATCHED", rating: 9, review: "Hitchcock's most personal film. The dolly zoom shot is unforgettable.", watchedAt: new Date("2021-01-20") },
      { userId: bob.id, tmdbId: 422, mediaType: "MOVIE", title: "Rear Window", posterUrl: "https://image.tmdb.org/t/p/w500/YRMET7crNpAMD9MjFOitsFHxlY.jpg", releaseYear: 1954, status: "WATCHED", rating: 9, review: "The greatest film about the voyeuristic nature of cinema itself.", watchedAt: new Date("2021-02-10") },
      { userId: bob.id, tmdbId: 539, mediaType: "MOVIE", title: "Psycho", posterUrl: "https://image.tmdb.org/t/p/w500/yz4QVqPx3h4s4JGMYhTMXdyGxDU.jpg", releaseYear: 1960, status: "WATCHED", rating: 9, review: "The shower scene is still terrifying 60+ years later. Bernard Herrmann's score.", watchedAt: new Date("2021-03-05") },
      { userId: bob.id, tmdbId: 769, mediaType: "MOVIE", title: "GoodFellas", posterUrl: "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg", releaseYear: 1990, status: "WATCHED", rating: 10, review: "Scorsese's technical masterpiece. The Copacabana steadicam shot is perfect.", watchedAt: new Date("2021-06-20") },
      { userId: bob.id, tmdbId: 680, mediaType: "MOVIE", title: "Pulp Fiction", posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", releaseYear: 1994, status: "WATCHED", rating: 10, review: "Redefined what film could be. Every scene is quotable.", watchedAt: new Date("2020-11-25") },
      { userId: bob.id, tmdbId: 550, mediaType: "MOVIE", title: "Fight Club", posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", releaseYear: 1999, status: "WATCHED", rating: 9, review: "Fincher's most visceral film. The twist still gets people.", watchedAt: new Date("2021-08-10") },
      { userId: bob.id, tmdbId: 155, mediaType: "MOVIE", title: "The Dark Knight", posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", releaseYear: 2008, status: "WATCHED", rating: 10, review: "Ledger's Joker is the greatest villain performance in cinema history.", watchedAt: new Date("2022-10-31") },
      { userId: bob.id, tmdbId: 6977, mediaType: "MOVIE", title: "No Country for Old Men", posterUrl: "https://image.tmdb.org/t/p/w500/6d5XOczc5LGTkImBVQBB8M2MMWL.jpg", releaseYear: 2007, status: "WATCHED", rating: 9, review: "Anton Chigurh is the most terrifying villain put to screen.", watchedAt: new Date("2022-12-15") },
      { userId: bob.id, tmdbId: 3052, mediaType: "MOVIE", title: "There Will Be Blood", posterUrl: "https://image.tmdb.org/t/p/w500/fa0RDkAlCec0STeMNAhPaF89q6N.jpg", releaseYear: 2007, status: "WATCHED", rating: 9, review: "DDL's Daniel Plainview is one of cinema's greatest characters.", watchedAt: new Date("2023-01-15") },
      { userId: bob.id, tmdbId: 1422, mediaType: "MOVIE", title: "Apocalypse Now", posterUrl: "https://image.tmdb.org/t/p/w500/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg", releaseYear: 1979, status: "WATCHED", rating: 10, review: "The horror and beauty of war captured on film. The making-of doc is equally good.", watchedAt: new Date("2023-02-20") },
      { userId: bob.id, tmdbId: 600, mediaType: "MOVIE", title: "Full Metal Jacket", posterUrl: "https://image.tmdb.org/t/p/w500/jhi8Mw82VpJ3LZPQR9UvTB3skhZ.jpg", releaseYear: 1987, status: "WATCHED", rating: 9, review: "The first half is a masterclass. R. Lee Ermey's Hartman is iconic.", watchedAt: new Date("2023-03-25") },
      { userId: bob.id, tmdbId: 807, mediaType: "MOVIE", title: "Se7en", posterUrl: "https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg", releaseYear: 1995, status: "WATCHED", rating: 9, review: "The box scene. What's in the box. I won't say.", watchedAt: new Date("2022-09-05") },
      { userId: bob.id, tmdbId: 274, mediaType: "MOVIE", title: "The Silence of the Lambs", posterUrl: "https://image.tmdb.org/t/p/w500/rplLJ2hPcOQmkFhTqUte0MkosIF.jpg", releaseYear: 1991, status: "WATCHED", rating: 10, review: "Hopkins and Foster have the greatest screen chemistry. Deserved every Oscar.", watchedAt: new Date("2021-09-15") },
      { userId: bob.id, tmdbId: 949, mediaType: "MOVIE", title: "Heat", posterUrl: "https://image.tmdb.org/t/p/w500/zECUAN7SrmCMfCMFWnRIyEJQdNq.jpg", releaseYear: 1995, status: "WATCHED", rating: 10, review: "The diner scene between Pacino and De Niro is the greatest scene in cinema.", watchedAt: new Date("2023-04-20") },
      { userId: bob.id, tmdbId: 76331, mediaType: "TV", title: "Succession", posterUrl: "https://image.tmdb.org/t/p/w500/e2X8xBm1YzsgNbU0xRuZmKBhp8W.jpg", releaseYear: 2018, status: "WATCHED", rating: 10, review: "The best drama of the 2020s. The finale is perfect television.", watchedAt: new Date("2023-06-01") },
      { userId: bob.id, tmdbId: 1438, mediaType: "TV", title: "The Wire", posterUrl: "https://image.tmdb.org/t/p/w500/4vFD8QECJm5fvCFMXTQLRTF7GWE.jpg", releaseYear: 2002, status: "WATCHED", rating: 10, review: "The greatest TV show ever made. Season 4 (the schools) is devastating.", watchedAt: new Date("2022-05-30") },
      { userId: bob.id, tmdbId: 1104, mediaType: "TV", title: "Mad Men", posterUrl: "https://image.tmdb.org/t/p/w500/o2iLLmJFnXi2aMBUkOsXJkQ7MxS.jpg", releaseYear: 2007, status: "WATCHING" },
      { userId: bob.id, tmdbId: 62817, mediaType: "TV", title: "Better Call Saul", posterUrl: "https://image.tmdb.org/t/p/w500/ba4CpvnaxvAgff2jHiaqJrpDiB3.jpg", releaseYear: 2015, status: "WATCHED", rating: 10, review: "Surpassed Breaking Bad. The finale left me speechless for an hour.", watchedAt: new Date("2022-08-20") },
      { userId: bob.id, tmdbId: 45054, mediaType: "TV", title: "House of Cards", posterUrl: "https://image.tmdb.org/t/p/w500/hKWXPkBNhBuW0Rr0zqb2NwMEE1b.jpg", releaseYear: 2013, status: "WATCHED", rating: 7, review: "First two seasons are great. Falls off hard but worth watching early seasons.", watchedAt: new Date("2021-11-20") },
      { userId: bob.id, tmdbId: 2649, mediaType: "MOVIE", title: "Zodiac", posterUrl: "https://image.tmdb.org/t/p/w500/a9JNwVAiUAzNH6XZx7gWHOFWkv5.jpg", releaseYear: 2007, status: "WATCHED", rating: 9, review: "Fincher's most underrated film. The obsession of the investigators is haunting.", watchedAt: new Date("2024-07-15") },
      { userId: bob.id, tmdbId: 1907, mediaType: "MOVIE", title: "L.A. Confidential", posterUrl: "https://image.tmdb.org/t/p/w500/85dx2cwHq74aBEbizB2zC3XYEF5.jpg", releaseYear: 1997, status: "WATCHED", rating: 9, review: "The best neo-noir since Chinatown. Russell Crowe's best performance.", watchedAt: new Date("2024-08-20") },
      { userId: bob.id, tmdbId: 62, mediaType: "MOVIE", title: "2001: A Space Odyssey", posterUrl: "https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg", releaseYear: 1968, status: "WATCHED", rating: 9, review: "Kubrick's 70mm experience in a proper cinema is transformative.", watchedAt: new Date("2021-05-01") },

      // ── Carol extra 24 ──────────────────────────────────────────
      { userId: carol.id, tmdbId: 153, mediaType: "MOVIE", title: "Lost in Translation", posterUrl: "https://image.tmdb.org/t/p/w500/sAtoMqDVhNDQBc3QJL3RF6hlhGq.jpg", releaseYear: 2003, status: "WATCHED", rating: 9, review: "Made me fall in love with Tokyo before I'd even been there.", watchedAt: new Date("2022-04-10") },
      { userId: carol.id, tmdbId: 71672, mediaType: "MOVIE", title: "Midnight in Paris", posterUrl: "https://image.tmdb.org/t/p/w500/4wkOHdLfCPjzuRRtUFvYJPXIi3H.jpg", releaseYear: 2011, status: "WATCHED", rating: 9, review: "Every Paris trip I've taken has felt like this film.", watchedAt: new Date("2019-08-15") },
      { userId: carol.id, tmdbId: 836, mediaType: "MOVIE", title: "Roman Holiday", posterUrl: "https://image.tmdb.org/t/p/w500/9R7UZ0FZPD3r3hFXKUFpqfLiNnk.jpg", releaseYear: 1953, status: "WATCHED", rating: 8, review: "Audrey Hepburn is cinema. Rome has never looked more beautiful.", watchedAt: new Date("2021-07-20") },
      { userId: carol.id, tmdbId: 116745, mediaType: "MOVIE", title: "The Secret Life of Walter Mitty", posterUrl: "https://image.tmdb.org/t/p/w500/bQS43HSLGlcMNdVCbF5KBBR5Y89.jpg", releaseYear: 2013, status: "WATCHED", rating: 9, review: "The Iceland scenes made me book flights immediately. Pure wanderlust.", watchedAt: new Date("2020-03-15") },
      { userId: carol.id, tmdbId: 213121, mediaType: "MOVIE", title: "Wild", posterUrl: "https://image.tmdb.org/t/p/w500/bnth7wSG9XBMVTeSamqd2fDFXAP.jpg", releaseYear: 2014, status: "WATCHED", rating: 8, review: "Cheryl Strayed's memoir brought to life. The hiking footage is gorgeous.", watchedAt: new Date("2016-09-01") },
      { userId: carol.id, tmdbId: 128, mediaType: "MOVIE", title: "Princess Mononoke", posterUrl: "https://image.tmdb.org/t/p/w500/oKRRBuXWbD2opQW1L3Ywx7Nfvhi.jpg", releaseYear: 1997, status: "WATCHED", rating: 9, review: "Miyazaki's most epic film. The forest spirits and nature imagery are stunning.", watchedAt: new Date("2024-06-25") },
      { userId: carol.id, tmdbId: 8392, mediaType: "MOVIE", title: "My Neighbor Totoro", posterUrl: "https://image.tmdb.org/t/p/w500/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg", releaseYear: 1988, status: "WATCHED", rating: 10, review: "Pure joy. Totoro is the most comforting fictional character ever created.", watchedAt: new Date("2024-06-23") },
      { userId: carol.id, tmdbId: 4935, mediaType: "MOVIE", title: "Howl's Moving Castle", posterUrl: "https://image.tmdb.org/t/p/w500/TkFHWetUHHzV5HBKVn2i2x7aSMf.jpg", releaseYear: 2004, status: "WATCHED", rating: 9, review: "The castle design is a marvel. Sophie and Howl are my favorite animated couple.", watchedAt: new Date("2024-06-24") },
      { userId: carol.id, tmdbId: 16859, mediaType: "MOVIE", title: "Kiki's Delivery Service", posterUrl: "https://image.tmdb.org/t/p/w500/pPh7yFPaxRTEzBYZifWcfHh1Y3H.jpg", releaseYear: 1989, status: "WATCHED", rating: 9, review: "A gentle story about finding your place. Makes me want to move to a European town.", watchedAt: new Date("2024-06-26") },
      { userId: carol.id, tmdbId: 194, mediaType: "MOVIE", title: "Amélie", posterUrl: "https://image.tmdb.org/t/p/w500/mGnkMqdXkjCmqjBoiYwDU7WhT3H.jpg", releaseYear: 2001, status: "WATCHED", rating: 10, review: "Made me love Paris before I visited. Jeunet's visual whimsy is unmatched.", watchedAt: new Date("2018-10-10") },
      { userId: carol.id, tmdbId: 901, mediaType: "MOVIE", title: "Cinema Paradiso", posterUrl: "https://image.tmdb.org/t/p/w500/mYp9KiGq8cLWXPLIcCHFPJrSTBi.jpg", releaseYear: 1988, status: "WATCHED", rating: 10, review: "The final reel scene is the most cathartic moment in all of cinema.", watchedAt: new Date("2022-12-31") },
      { userId: carol.id, tmdbId: 20352, mediaType: "MOVIE", title: "Julie & Julia", posterUrl: "https://image.tmdb.org/t/p/w500/w7cA0Z7PH8BaOLVVmDhJCxm7Nwe.jpg", releaseYear: 2009, status: "WATCHED", rating: 8, review: "Meryl Streep IS Julia Child. Made me cook through a cookbook.", watchedAt: new Date("2023-11-10") },
      { userId: carol.id, tmdbId: 2062, mediaType: "MOVIE", title: "Ratatouille", posterUrl: "https://image.tmdb.org/t/p/w500/s9YFzoAQFAFyBSXdQ2i3J5SGIPM.jpg", releaseYear: 2007, status: "WATCHED", rating: 9, review: "The food scenes made me hungry and the Paris streets made me homesick for a city I'd never visited.", watchedAt: new Date("2023-08-30") },
      { userId: carol.id, tmdbId: 354912, mediaType: "MOVIE", title: "Coco", posterUrl: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg", releaseYear: 2017, status: "WATCHED", rating: 9, review: "Made me plan a trip to Mexico for Día de los Muertos. Remember me destroyed me.", watchedAt: new Date("2021-11-01") },
      { userId: carol.id, tmdbId: 508442, mediaType: "MOVIE", title: "Soul", posterUrl: "https://image.tmdb.org/t/p/w500/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg", releaseYear: 2020, status: "WATCHED", rating: 9, review: "Pixar's most philosophical film. The jazz sequences are gorgeous.", watchedAt: new Date("2020-12-25") },
      { userId: carol.id, tmdbId: 545611, mediaType: "MOVIE", title: "Everything Everywhere All at Once", posterUrl: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg", releaseYear: 2022, status: "WATCHED", rating: 10, review: "The rocks scene. I sobbed. This film contains multitudes.", watchedAt: new Date("2022-11-05") },
      { userId: carol.id, tmdbId: 120467, mediaType: "MOVIE", title: "The Grand Budapest Hotel", posterUrl: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg", releaseYear: 2014, status: "WATCHED", rating: 9, review: "Wes Anderson at his most maximalist. The production design is a work of art.", watchedAt: new Date("2021-09-05") },
      { userId: carol.id, tmdbId: 601666, mediaType: "MOVIE", title: "Portrait of a Lady on Fire", posterUrl: "https://image.tmdb.org/t/p/w500/3NTAbAiao4JLfQKE8eqo7geG7Va.jpg", releaseYear: 2019, status: "WATCHED", rating: 9, review: "The most visually stunning love story I've ever seen. The fire scene.", watchedAt: new Date("2023-05-20") },
      { userId: carol.id, tmdbId: 581726, mediaType: "MOVIE", title: "Nomadland", posterUrl: "https://image.tmdb.org/t/p/w500/66PgM4BLzQlHGblFRfO9qGjnCVb.jpg", releaseYear: 2020, status: "WATCHED", rating: 8, review: "Frances McDormand disappearing into a role again. The American West is breathtaking.", watchedAt: new Date("2021-05-10") },
      { userId: carol.id, tmdbId: 104266, mediaType: "TV", title: "Emily in Paris", posterUrl: "https://image.tmdb.org/t/p/w500/4mDMJ8CaEetF1ZSiTbVvIjKuGnj.jpg", releaseYear: 2020, status: "WATCHED", rating: 6, review: "Delightfully silly comfort TV. The Paris cinematography is the real star.", watchedAt: new Date("2023-09-15") },
      { userId: carol.id, tmdbId: 62814, mediaType: "TV", title: "Chef's Table", posterUrl: "https://image.tmdb.org/t/p/w500/nOJPp5JyMOzHVFTjknqB2bE0rSU.jpg", releaseYear: 2015, status: "WATCHING" },
      { userId: carol.id, tmdbId: 84944, mediaType: "MOVIE", title: "Moonrise Kingdom", posterUrl: "https://image.tmdb.org/t/p/w500/mHe3LAUR4CxZ0bQHHKGiGaRPY7k.jpg", releaseYear: 2012, status: "WATCHED", rating: 8, review: "Wes Anderson's most tender film. The island adventures made me nostalgic for summers I never had.", watchedAt: new Date("2022-07-15") },
      { userId: carol.id, tmdbId: 65754, mediaType: "MOVIE", title: "The Way", posterUrl: "https://image.tmdb.org/t/p/w500/4Z6UZMIB5OHe6x9gIBfhobqRN5.jpg", releaseYear: 2010, status: "WATCHED", rating: 8, review: "Martin Sheen walking the Camino de Santiago. Watching this sealed my plan to do it.", watchedAt: new Date("2024-11-15") },
      { userId: carol.id, tmdbId: 11587, mediaType: "MOVIE", title: "The Darjeeling Limited", posterUrl: "https://image.tmdb.org/t/p/w500/cz85iQWa4oJ5wG5M2mfr9XT3cWy.jpg", releaseYear: 2007, status: "WATCHED", rating: 7, review: "Wes Anderson's India. The train and the grief and the luggage.", watchedAt: new Date("2021-10-20") },
    ],
  })

  // ─── Places (10 per user) ─────────────────────────────────────
  await db.place.createMany({
    data: [
      // Alice — tech trips, conferences
      { userId: alice.id, name: "San Francisco", country: "United States", city: "San Francisco", latitude: 37.7749, longitude: -122.4194, visitedAt: new Date("2019-01-15"), notes: "Home since 2019. The fog never gets old." },
      { userId: alice.id, name: "New York City", country: "United States", city: "New York", latitude: 40.7128, longitude: -74.006, visitedAt: new Date("2022-09-20"), notes: "Attended NYC Tech Week. So much energy in this city." },
      { userId: alice.id, name: "London", country: "United Kingdom", city: "London", latitude: 51.5074, longitude: -0.1278, visitedAt: new Date("2023-06-10"), notes: "Work trip to meet the Vercel team. Loved the museums." },
      { userId: alice.id, name: "Amsterdam", country: "Netherlands", city: "Amsterdam", latitude: 52.3676, longitude: 4.9041, visitedAt: new Date("2023-06-14"), notes: "Layover turned into 2 days of cycling and canals." },
      { userId: alice.id, name: "Tokyo", country: "Japan", city: "Tokyo", latitude: 35.6762, longitude: 139.6503, visitedAt: new Date("2024-04-01"), notes: "Cherry blossom season was unreal. 🌸" },
      { userId: alice.id, name: "Kyoto", country: "Japan", city: "Kyoto", latitude: 35.0116, longitude: 135.7681, visitedAt: new Date("2024-04-05"), notes: "Fushimi Inari at 5am — no crowds, pure magic." },
      { userId: alice.id, name: "Berlin", country: "Germany", city: "Berlin", latitude: 52.52, longitude: 13.405, visitedAt: new Date("2023-06-18"), notes: "React Summit Europe. The tech community here is amazing." },
      { userId: alice.id, name: "Montreal", country: "Canada", city: "Montreal", latitude: 45.5017, longitude: -73.5673, visitedAt: new Date("2022-07-04"), notes: "Jazz festival! Poutine every day." },
      { userId: alice.id, name: "Seattle", country: "United States", city: "Seattle", latitude: 47.6062, longitude: -122.3321, visitedAt: new Date("2021-10-12"), notes: "AWS re:Invent preview event. Rain is overrated as a reputation." },
      { userId: alice.id, name: "Singapore", country: "Singapore", city: "Singapore", latitude: 1.3521, longitude: 103.8198, visitedAt: new Date("2024-11-01"), notes: "LayerZero Asia conference. The food is incredible." },

      // Bob — film locations, cities
      { userId: bob.id, name: "New York City", country: "United States", city: "New York", latitude: 40.7128, longitude: -74.006, visitedAt: new Date("2018-01-01"), notes: "Home. Best pizza in the world, end of story." },
      { userId: bob.id, name: "Los Angeles", country: "United States", city: "Los Angeles", latitude: 34.0522, longitude: -118.2437, visitedAt: new Date("2022-03-15"), notes: "Netflix HQ + studio tours. Hollywood sign in person is underwhelming." },
      { userId: bob.id, name: "Rome", country: "Italy", city: "Rome", latitude: 41.9028, longitude: 12.4964, visitedAt: new Date("2023-07-20"), notes: "Gladiator filming locations. Standing in the Colosseum gave me chills." },
      { userId: bob.id, name: "Prague", country: "Czech Republic", city: "Prague", latitude: 50.0755, longitude: 14.4378, visitedAt: new Date("2023-07-25"), notes: "Most cinematic city in Europe. Every street feels like a set." },
      { userId: bob.id, name: "Tokyo", country: "Japan", city: "Tokyo", latitude: 35.6762, longitude: 139.6503, visitedAt: new Date("2024-03-10"), notes: "Shibuya at midnight = Blade Runner. Loved every second." },
      { userId: bob.id, name: "Paris", country: "France", city: "Paris", latitude: 48.8566, longitude: 2.3522, visitedAt: new Date("2023-07-15"), notes: "Cinémathèque Française is a pilgrimage for film lovers." },
      { userId: bob.id, name: "New Orleans", country: "United States", city: "New Orleans", latitude: 29.9511, longitude: -90.0715, visitedAt: new Date("2021-09-05"), notes: "Jazz Fest. Beignets. Hauntingly beautiful city." },
      { userId: bob.id, name: "Chicago", country: "United States", city: "Chicago", latitude: 41.8781, longitude: -87.6298, visitedAt: new Date("2022-11-10"), notes: "Chicago International Film Festival. Deep dish > NY pizza (controversial)." },
      { userId: bob.id, name: "Reykjavik", country: "Iceland", city: "Reykjavik", latitude: 64.1355, longitude: -21.8954, visitedAt: new Date("2024-01-15"), notes: "Northern lights. Nothing prepares you for the Northern lights." },
      { userId: bob.id, name: "Buenos Aires", country: "Argentina", city: "Buenos Aires", latitude: -34.6037, longitude: -58.3816, visitedAt: new Date("2024-09-01"), notes: "Tango, steak, and the best bookshops I've ever seen." },

      // Carol — travel-heavy
      { userId: carol.id, name: "Tokyo", country: "Japan", city: "Tokyo", latitude: 35.6762, longitude: 139.6503, visitedAt: new Date("2025-01-15"), notes: "Just got back! Tsukiji outer market at 6am, Shibuya crossing, cat cafes." },
      { userId: carol.id, name: "Kyoto", country: "Japan", city: "Kyoto", latitude: 35.0116, longitude: 135.7681, visitedAt: new Date("2025-01-20"), notes: "Arashiyama bamboo grove. Gion at night. Perfect." },
      { userId: carol.id, name: "Patagonia", country: "Argentina", city: "El Calafate", latitude: -50.3374, longitude: -72.2654, visitedAt: new Date("2022-12-10"), notes: "Perito Moreno glacier calving. The sound will haunt me forever." },
      { userId: carol.id, name: "Marrakech", country: "Morocco", city: "Marrakech", latitude: 31.6295, longitude: -7.9811, visitedAt: new Date("2023-04-05"), notes: "The medina souks are overwhelming in the best way. Got completely lost, twice." },
      { userId: carol.id, name: "Bali", country: "Indonesia", city: "Ubud", latitude: -8.5069, longitude: 115.2625, visitedAt: new Date("2023-08-20"), notes: "Rice terraces at sunrise. Working remotely from a villa was peak life." },
      { userId: carol.id, name: "Lisbon", country: "Portugal", city: "Lisbon", latitude: 38.7169, longitude: -9.1399, visitedAt: new Date("2024-05-10"), notes: "Fado music, pastel de nata, and the best views. Moving here someday." },
      { userId: carol.id, name: "Queenstown", country: "New Zealand", city: "Queenstown", latitude: -45.0312, longitude: 168.6626, visitedAt: new Date("2020-02-15"), notes: "Bungee jumping off the Nevis. Still the scariest and best thing I've done." },
      { userId: carol.id, name: "Santorini", country: "Greece", city: "Santorini", latitude: 36.3932, longitude: 25.4615, visitedAt: new Date("2019-09-01"), notes: "Oia sunset with a glass of local wine. Cliché but earned." },
      { userId: carol.id, name: "Austin", country: "United States", city: "Austin", latitude: 30.2672, longitude: -97.7431, visitedAt: new Date("2017-01-01"), notes: "Home base. Keep Austin weird, always." },
      { userId: carol.id, name: "Cape Town", country: "South Africa", city: "Cape Town", latitude: -33.9249, longitude: 18.4241, visitedAt: new Date("2024-07-20"), notes: "Table Mountain hike at sunset. Penguin colony at Boulders Beach. 10/10." },

      // ── Alice extra 24 ──────────────────────────────────────────
      { userId: alice.id, name: "Portland", country: "United States", city: "Portland", latitude: 45.5051, longitude: -122.6750, visitedAt: new Date("2021-06-15"), notes: "Best coffee culture in the US. The Powell's bookstore is a life event." },
      { userId: alice.id, name: "Denver", country: "United States", city: "Denver", latitude: 39.7392, longitude: -104.9903, visitedAt: new Date("2022-04-10"), notes: "Hack the Ridge conference. Rocky Mountain views from every rooftop bar." },
      { userId: alice.id, name: "Austin", country: "United States", city: "Austin", latitude: 30.2672, longitude: -97.7431, visitedAt: new Date("2023-03-12"), notes: "SXSW Interactive. The tech talks were great; the tacos were better." },
      { userId: alice.id, name: "Vancouver", country: "Canada", city: "Vancouver", latitude: 49.2827, longitude: -123.1207, visitedAt: new Date("2022-08-20"), notes: "Remote work trip. Granville Island market + mountains in every direction." },
      { userId: alice.id, name: "Toronto", country: "Canada", city: "Toronto", latitude: 43.6532, longitude: -79.3832, visitedAt: new Date("2023-09-05"), notes: "Collision conference. Loved the waterfront and the diverse food scene." },
      { userId: alice.id, name: "Dublin", country: "Ireland", city: "Dublin", latitude: 53.3498, longitude: -6.2603, visitedAt: new Date("2023-06-09"), notes: "Stopover before London. Trinity College library (Book of Kells) was extraordinary." },
      { userId: alice.id, name: "Zurich", country: "Switzerland", city: "Zurich", latitude: 47.3769, longitude: 8.5417, visitedAt: new Date("2024-05-20"), notes: "Everything works. The lake is impossibly blue. Expensive but worth it." },
      { userId: alice.id, name: "Copenhagen", country: "Denmark", city: "Copenhagen", latitude: 55.6761, longitude: 12.5683, visitedAt: new Date("2024-05-24"), notes: "Everyone cycles everywhere. Noma's former site. The hygge is real." },
      { userId: alice.id, name: "Stockholm", country: "Sweden", city: "Stockholm", latitude: 59.3293, longitude: 18.0686, visitedAt: new Date("2024-05-27"), notes: "Gamla Stan at golden hour. ABBA Museum. Perfect Scandinavian design everywhere." },
      { userId: alice.id, name: "Oslo", country: "Norway", city: "Oslo", latitude: 59.9139, longitude: 10.7522, visitedAt: new Date("2024-05-30"), notes: "The Viking Ship Museum. Aker Brygge waterfront. Worth every expensive krone." },
      { userId: alice.id, name: "Barcelona", country: "Spain", city: "Barcelona", latitude: 41.3851, longitude: 2.1734, visitedAt: new Date("2023-06-20"), notes: "Sagrada Família is the most audacious building I've ever stood inside." },
      { userId: alice.id, name: "Lisbon", country: "Portugal", city: "Lisbon", latitude: 38.7169, longitude: -9.1399, visitedAt: new Date("2023-06-22"), notes: "Tram 28 up to Alfama. Pastel de nata every morning. Moving here someday." },
      { userId: alice.id, name: "Vienna", country: "Austria", city: "Vienna", latitude: 48.2082, longitude: 16.3738, visitedAt: new Date("2024-05-18"), notes: "Kunsthistorisches Museum. Coffee house culture. Mozart everywhere (in a good way)." },
      { userId: alice.id, name: "Prague", country: "Czech Republic", city: "Prague", latitude: 50.0755, longitude: 14.4378, visitedAt: new Date("2024-05-15"), notes: "Charles Bridge before sunrise — no tourists. The old town is a fairytale." },
      { userId: alice.id, name: "Budapest", country: "Hungary", city: "Budapest", latitude: 47.4979, longitude: 19.0402, visitedAt: new Date("2024-05-12"), notes: "The thermal baths are incredible. Ruin bars are unlike anything in the world." },
      { userId: alice.id, name: "Osaka", country: "Japan", city: "Osaka", latitude: 34.6937, longitude: 135.5022, visitedAt: new Date("2024-04-08"), notes: "Japan's food capital. Dotonbori at night is sensory overload in the best way." },
      { userId: alice.id, name: "Hiroshima", country: "Japan", city: "Hiroshima", latitude: 34.3853, longitude: 132.4553, visitedAt: new Date("2024-04-10"), notes: "Peace Memorial Museum is the most affecting museum I've ever visited." },
      { userId: alice.id, name: "Hong Kong", country: "China", city: "Hong Kong", latitude: 22.3193, longitude: 114.1694, visitedAt: new Date("2024-11-04"), notes: "Victoria Peak at night. Dim sum breakfast. The tram still runs for a few cents." },
      { userId: alice.id, name: "Seoul", country: "South Korea", city: "Seoul", latitude: 37.5665, longitude: 126.9780, visitedAt: new Date("2024-11-08"), notes: "Bukchon Hanok Village + modern skyscrapers in the same frame. Future city energy." },
      { userId: alice.id, name: "Dubai", country: "UAE", city: "Dubai", latitude: 25.2048, longitude: 55.2708, visitedAt: new Date("2024-10-28"), notes: "Stopover on the way to Singapore. The Burj Khalifa at night is absurd." },
      { userId: alice.id, name: "Istanbul", country: "Turkey", city: "Istanbul", latitude: 41.0082, longitude: 28.9784, visitedAt: new Date("2023-07-01"), notes: "Two continents in one city. The Hagia Sophia changes you." },
      { userId: alice.id, name: "Cape Town", country: "South Africa", city: "Cape Town", latitude: -33.9249, longitude: 18.4241, visitedAt: new Date("2025-01-05"), notes: "Table Mountain in the clouds. Boulder's penguins. V&A Waterfront sunsets." },
      { userId: alice.id, name: "Sydney", country: "Australia", city: "Sydney", latitude: -33.8688, longitude: 151.2093, visitedAt: new Date("2024-12-28"), notes: "NYE at the harbour bridge. The Opera House is even more impressive in person." },
      { userId: alice.id, name: "Melbourne", country: "Australia", city: "Melbourne", latitude: -37.8136, longitude: 144.9631, visitedAt: new Date("2025-01-02"), notes: "Best coffee in the Southern Hemisphere. The laneway street art is world-class." },

      // ── Bob extra 24 ────────────────────────────────────────────
      { userId: bob.id, name: "Vienna", country: "Austria", city: "Vienna", latitude: 48.2082, longitude: 16.3738, visitedAt: new Date("2023-07-28"), notes: "Kunsthistorisches Museum. Coffee houses that smell like time itself." },
      { userId: bob.id, name: "Budapest", country: "Hungary", city: "Budapest", latitude: 47.4979, longitude: 19.0402, visitedAt: new Date("2023-07-30"), notes: "Most underrated European capital. Ruin bars and thermal baths every night." },
      { userId: bob.id, name: "Venice", country: "Italy", city: "Venice", latitude: 45.4408, longitude: 12.3155, visitedAt: new Date("2023-07-22"), notes: "Overrun with tourists but still magical at 6am. The canals catch gold light." },
      { userId: bob.id, name: "Florence", country: "Italy", city: "Florence", latitude: 43.7696, longitude: 11.2558, visitedAt: new Date("2023-07-18"), notes: "The Uffizi. The David. The bistecca fiorentina. Renaissance art everywhere." },
      { userId: bob.id, name: "Edinburgh", country: "Scotland", city: "Edinburgh", latitude: 55.9533, longitude: -3.1883, visitedAt: new Date("2022-08-10"), notes: "The Fringe Festival! Every doorway has a show. The castle looms over everything." },
      { userId: bob.id, name: "Dublin", country: "Ireland", city: "Dublin", latitude: 53.3498, longitude: -6.2603, visitedAt: new Date("2022-08-12"), notes: "Guinness Storehouse is touristy but fun. The Irish are the best storytellers." },
      { userId: bob.id, name: "Manchester", country: "United Kingdom", city: "Manchester", latitude: 53.4808, longitude: -2.2426, visitedAt: new Date("2022-08-15"), notes: "Old Trafford pilgrimage. Factory Records history. Incredible live music scene." },
      { userId: bob.id, name: "Havana", country: "Cuba", city: "Havana", latitude: 23.1136, longitude: -82.3666, visitedAt: new Date("2023-02-10"), notes: "1950s cars on every street. Malecon at sunset. Time truly stopped here." },
      { userId: bob.id, name: "Mexico City", country: "Mexico", city: "Mexico City", latitude: 19.4326, longitude: -99.1332, visitedAt: new Date("2023-02-15"), notes: "Frida Kahlo Museum. Lucha libre. Best tacos on the planet, honestly." },
      { userId: bob.id, name: "Lima", country: "Peru", city: "Lima", latitude: -12.0464, longitude: -77.0428, visitedAt: new Date("2024-09-05"), notes: "Gastronomic capital of South America. Ceviche every single day." },
      { userId: bob.id, name: "Amsterdam", country: "Netherlands", city: "Amsterdam", latitude: 52.3676, longitude: 4.9041, visitedAt: new Date("2023-07-14"), notes: "Van Gogh Museum. Rijksmuseum. The cycling infrastructure is humbling." },
      { userId: bob.id, name: "Seville", country: "Spain", city: "Seville", latitude: 37.3891, longitude: -5.9845, visitedAt: new Date("2024-03-20"), notes: "The Real Alcázar was used in GoT. Flamenco until 3am. Orange blossoms everywhere." },
      { userId: bob.id, name: "Madrid", country: "Spain", city: "Madrid", latitude: 40.4168, longitude: -3.7038, visitedAt: new Date("2024-03-22"), notes: "Prado Museum has Velázquez and Goya. Reina Sofía has Guernica. Dinner at 10pm." },
      { userId: bob.id, name: "Lisbon", country: "Portugal", city: "Lisbon", latitude: 38.7169, longitude: -9.1399, visitedAt: new Date("2024-03-18"), notes: "Alfama fado bars at midnight. Pastéis de nata for breakfast. City of melancholy." },
      { userId: bob.id, name: "Istanbul", country: "Turkey", city: "Istanbul", latitude: 41.0082, longitude: 28.9784, visitedAt: new Date("2023-07-12"), notes: "Most cinematic city I've ever seen. The Grand Bazaar is pure sensory overload." },
      { userId: bob.id, name: "Athens", country: "Greece", city: "Athens", latitude: 37.9838, longitude: 23.7275, visitedAt: new Date("2023-07-05"), notes: "The Acropolis at dusk. Standing where democracy was invented. Overwhelming." },
      { userId: bob.id, name: "Dubrovnik", country: "Croatia", city: "Dubrovnik", latitude: 42.6507, longitude: 18.0944, visitedAt: new Date("2023-07-08"), notes: "King's Landing in real life. The city walls walk at golden hour is stunning." },
      { userId: bob.id, name: "Warsaw", country: "Poland", city: "Warsaw", latitude: 52.2297, longitude: 21.0122, visitedAt: new Date("2024-09-10"), notes: "The Old Town's post-war reconstruction is remarkable. POLIN Museum is essential." },
      { userId: bob.id, name: "Kraków", country: "Poland", city: "Kraków", latitude: 50.0647, longitude: 19.9450, visitedAt: new Date("2024-09-12"), notes: "The old market square is magnificent. Auschwitz-Birkenau visit changed something in me." },
      { userId: bob.id, name: "Seoul", country: "South Korea", city: "Seoul", latitude: 37.5665, longitude: 126.9780, visitedAt: new Date("2024-03-12"), notes: "Gangnam style (literally). K-culture everywhere. DMZ tour was sobering." },
      { userId: bob.id, name: "Sydney", country: "Australia", city: "Sydney", latitude: -33.8688, longitude: 151.2093, visitedAt: new Date("2024-09-20"), notes: "Sydney Film Festival. Opera House is even more striking at night from Circular Quay." },
      { userId: bob.id, name: "Nairobi", country: "Kenya", city: "Nairobi", latitude: -1.2921, longitude: 36.8219, visitedAt: new Date("2024-09-25"), notes: "Maasai Mara safari. Lions within 10 metres. Nothing prepares you for that." },
      { userId: bob.id, name: "Marrakech", country: "Morocco", city: "Marrakech", latitude: 31.6295, longitude: -7.9811, visitedAt: new Date("2024-02-20"), notes: "The souks are labyrinthine. Djemaa el-Fna at night is pure theatre." },
      { userId: bob.id, name: "Singapore", country: "Singapore", city: "Singapore", latitude: 1.3521, longitude: 103.8198, visitedAt: new Date("2024-03-08"), notes: "Hawker centres are the world's best food courts. Gardens by the Bay at night is surreal." },

      // ── Carol extra 24 ──────────────────────────────────────────
      { userId: carol.id, name: "New York City", country: "United States", city: "New York", latitude: 40.7128, longitude: -74.0060, visitedAt: new Date("2022-06-10"), notes: "Design week. MoMA. The High Line. Croissants at Balthazar. Always energising." },
      { userId: carol.id, name: "London", country: "United Kingdom", city: "London", latitude: 51.5074, longitude: -0.1278, visitedAt: new Date("2023-10-01"), notes: "Tate Modern. Borough Market. Nothing beats a Sunday roast in Notting Hill." },
      { userId: carol.id, name: "Paris", country: "France", city: "Paris", latitude: 48.8566, longitude: 2.3522, visitedAt: new Date("2024-04-20"), notes: "Design conference + Musée d'Orsay. Every arrondissement has a different feel." },
      { userId: carol.id, name: "Rome", country: "Italy", city: "Rome", latitude: 41.9028, longitude: 12.4964, visitedAt: new Date("2022-09-10"), notes: "Galleria Borghese is the best art museum nobody talks about. Gelato every hour." },
      { userId: carol.id, name: "Florence", country: "Italy", city: "Florence", latitude: 43.7696, longitude: 11.2558, visitedAt: new Date("2022-09-14"), notes: "The Uffizi. The Duomo at dawn. Crossing the Ponte Vecchio at sunrise alone." },
      { userId: carol.id, name: "Dubrovnik", country: "Croatia", city: "Dubrovnik", latitude: 42.6507, longitude: 18.0944, visitedAt: new Date("2023-06-10"), notes: "Kayaking around the city walls. GoT location tour. Adriatic sea at its bluest." },
      { userId: carol.id, name: "Chiang Mai", country: "Thailand", city: "Chiang Mai", latitude: 18.7883, longitude: 98.9853, visitedAt: new Date("2021-11-20"), notes: "Yi Peng lantern festival. Elephant sanctuary. Thai cooking class every morning." },
      { userId: carol.id, name: "Hanoi", country: "Vietnam", city: "Hanoi", latitude: 21.0285, longitude: 105.8542, visitedAt: new Date("2021-11-10"), notes: "Hoan Kiem Lake at dawn. Egg coffee in the old quarter. The chaos is addictive." },
      { userId: carol.id, name: "Ho Chi Minh City", country: "Vietnam", city: "Ho Chi Minh City", latitude: 10.8231, longitude: 106.6297, visitedAt: new Date("2021-11-05"), notes: "War Remnants Museum is essential and devastating. The food scene is incredible." },
      { userId: carol.id, name: "Siem Reap", country: "Cambodia", city: "Siem Reap", latitude: 13.3671, longitude: 103.8448, visitedAt: new Date("2021-11-15"), notes: "Angkor Wat at sunrise. Nothing in the world looks like it. Humbling scale." },
      { userId: carol.id, name: "Maldives", country: "Maldives", city: "Malé", latitude: 3.2028, longitude: 73.2207, visitedAt: new Date("2022-04-01"), notes: "The water is not real. Floating over coral gardens. Bioluminescence at night." },
      { userId: carol.id, name: "Zanzibar", country: "Tanzania", city: "Stone Town", latitude: -6.1659, longitude: 39.2026, visitedAt: new Date("2024-07-25"), notes: "Spice tour. Freddie Mercury was born here! Swim with sea turtles at Nungwi." },
      { userId: carol.id, name: "Nairobi", country: "Kenya", city: "Nairobi", latitude: -1.2921, longitude: 36.8219, visitedAt: new Date("2024-07-22"), notes: "Maasai Mara game drive. Giraffes at the manor hotel during breakfast. Unforgettable." },
      { userId: carol.id, name: "Cusco", country: "Peru", city: "Cusco", latitude: -13.5319, longitude: -71.9675, visitedAt: new Date("2020-01-15"), notes: "Gateway to Machu Picchu. The Sacred Valley. Coca tea for altitude sickness." },
      { userId: carol.id, name: "Machu Picchu", country: "Peru", city: "Machu Picchu", latitude: -13.1631, longitude: -72.5449, visitedAt: new Date("2020-01-18"), notes: "Arrived via the Inca Trail. Standing there as the clouds parted. Life-defining." },
      { userId: carol.id, name: "Cartagena", country: "Colombia", city: "Cartagena", latitude: 10.3910, longitude: -75.4794, visitedAt: new Date("2023-03-05"), notes: "The walled city at golden hour. Colourful doorways everywhere. Cumbia until dawn." },
      { userId: carol.id, name: "Medellín", country: "Colombia", city: "Medellín", latitude: 6.2442, longitude: -75.5812, visitedAt: new Date("2023-03-08"), notes: "The transformation story is remarkable. Cable car to Comunas 13. Eternal spring." },
      { userId: carol.id, name: "Tulum", country: "Mexico", city: "Tulum", latitude: 20.2115, longitude: -87.4654, visitedAt: new Date("2022-01-10"), notes: "Cenote snorkelling. Mayan ruins above the Caribbean. Remote work paradise." },
      { userId: carol.id, name: "Vancouver", country: "Canada", city: "Vancouver", latitude: 49.2827, longitude: -123.1207, visitedAt: new Date("2023-09-20"), notes: "Mountains meeting the ocean. Granville Island. Best sushi outside Japan." },
      { userId: carol.id, name: "Reykjavik", country: "Iceland", city: "Reykjavik", latitude: 64.1355, longitude: -21.8954, visitedAt: new Date("2022-02-20"), notes: "Northern lights from a hot tub. The Blue Lagoon. Hallgrímskirkja at midnight sun." },
      { userId: carol.id, name: "Banff", country: "Canada", city: "Banff", latitude: 51.1784, longitude: -115.5708, visitedAt: new Date("2022-09-25"), notes: "Lake Louise is an impossible colour. Moraine Lake even more so. Bear sighting!" },
      { userId: carol.id, name: "Havana", country: "Cuba", city: "Havana", latitude: 23.1136, longitude: -82.3666, visitedAt: new Date("2023-12-28"), notes: "Classic cars. Mojitos at La Bodeguita del Medio. The music plays all night." },
      { userId: carol.id, name: "Edinburgh", country: "Scotland", city: "Edinburgh", latitude: 55.9533, longitude: -3.1883, visitedAt: new Date("2024-08-10"), notes: "Fringe Festival! Arthur's Seat hike. The castle with fog rolling in at dusk." },
      { userId: carol.id, name: "Amalfi Coast", country: "Italy", city: "Positano", latitude: 40.6344, longitude: 14.6023, visitedAt: new Date("2024-09-02"), notes: "Lemoncello and lemon pasta with a view of the Tyrrhenian. Terrifyingly beautiful cliffs." },
    ],
  })

  // ─── Goals (10 per user) ──────────────────────────────────────
  await db.goal.createMany({
    data: [
      // Alice
      { userId: alice.id, title: "Open-source a project with 1k GitHub stars", category: "Career", isCompleted: true, completedAt: new Date("2024-03-15"), description: "Reached 1,200 stars on my tRPC utilities library." },
      { userId: alice.id, title: "Get promoted to Staff Engineer", category: "Career", isCompleted: false, targetDate: new Date("2026-01-01"), description: "Working on a company-wide design system as my scope-defining project." },
      { userId: alice.id, title: "Visit all 7 continents", category: "Travel", isCompleted: false, description: "Have 4 so far — North America, Europe, Asia, South America." },
      { userId: alice.id, title: "Read 24 books in a year", category: "Learning", isCompleted: true, completedAt: new Date("2024-12-31"), description: "Finished 27! Audiobooks count." },
      { userId: alice.id, title: "Learn to surf", category: "Health", isCompleted: true, completedAt: new Date("2023-07-20"), description: "Took lessons in Santa Cruz. Can ride a wave without wiping out (sometimes)." },
      { userId: alice.id, title: "Run a half marathon", category: "Health", isCompleted: false, targetDate: new Date("2025-10-01"), description: "Training for the SF Half Marathon." },
      { userId: alice.id, title: "Build an AI-powered side project", category: "Career", isCompleted: false, targetDate: new Date("2025-06-30"), description: "Experimenting with LLMs for code review automation." },
      { userId: alice.id, title: "Learn Japanese (conversational)", category: "Learning", isCompleted: false, description: "At N4 level. Trip to Tokyo was the best motivation boost." },
      { userId: alice.id, title: "Give a talk at a major conference", category: "Career", isCompleted: true, completedAt: new Date("2024-06-15"), description: "Spoke at React Summit on design system architecture." },
      { userId: alice.id, title: "Meditate every day for 100 days", category: "Health", isCompleted: true, completedAt: new Date("2023-11-01"), description: "Used the Waking Up app. 100 day streak complete." },

      // Bob
      { userId: bob.id, title: "Watch every Best Picture Oscar winner", category: "Entertainment", isCompleted: false, description: "At 78/97. The pre-1970s are the hardest to find." },
      { userId: bob.id, title: "Write a feature-length screenplay", category: "Creative", isCompleted: true, completedAt: new Date("2023-12-20"), description: "Finished a 112-page thriller script. Shopping it to contests." },
      { userId: bob.id, title: "Visit every continent", category: "Travel", isCompleted: false, description: "Missing Antarctica and Africa. Bucket list." },
      { userId: bob.id, title: "Get to senior engineer at Netflix", category: "Career", isCompleted: true, completedAt: new Date("2023-06-01"), description: "Promoted after leading the transcoding pipeline rewrite." },
      { userId: bob.id, title: "Learn to play the piano", category: "Creative", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Taking lessons. Can play Clair de Lune — badly." },
      { userId: bob.id, title: "Deadlift 200kg", category: "Health", isCompleted: false, targetDate: new Date("2025-12-31"), description: "At 165kg currently. Steady progress." },
      { userId: bob.id, title: "Direct a short film", category: "Creative", isCompleted: false, targetDate: new Date("2026-06-30"), description: "Have the script. Need the crew. Finding cinematographer now." },
      { userId: bob.id, title: "Read the complete works of Dostoevsky", category: "Learning", isCompleted: false, description: "Done: Crime and Punishment, The Idiot. Next: The Brothers Karamazov." },
      { userId: bob.id, title: "Attend a film festival (Cannes or Sundance)", category: "Entertainment", isCompleted: true, completedAt: new Date("2024-01-28"), description: "Sundance 2024. Saw 11 films in 5 days." },
      { userId: bob.id, title: "Build a film review web app", category: "Career", isCompleted: false, targetDate: new Date("2025-09-01"), description: "Letterboxd but with social features I actually want." },

      // Carol
      { userId: carol.id, title: "Visit 50 countries before 40", category: "Travel", isCompleted: false, description: "At 34 countries. 6 years to go." },
      { userId: carol.id, title: "Launch my own design studio", category: "Career", isCompleted: false, targetDate: new Date("2026-01-01"), description: "Building client base while still at Airbnb." },
      { userId: carol.id, title: "Reach conversational Japanese", category: "Learning", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Tokyo trip proved how rusty my Duolingo Japanese is." },
      { userId: carol.id, title: "Complete the Camino de Santiago", category: "Travel", isCompleted: false, targetDate: new Date("2025-09-01"), description: "800km walk across Spain. Training has begun." },
      { userId: carol.id, title: "Read 1 book per month for a year", category: "Learning", isCompleted: true, completedAt: new Date("2023-12-31"), description: "Read 15 books in 2023. Blew past the goal." },
      { userId: carol.id, title: "Go bungee jumping", category: "Health", isCompleted: true, completedAt: new Date("2020-02-15"), description: "Nevis Highwire in Queenstown. 134m. Will never do it again. Would recommend." },
      { userId: carol.id, title: "Learn to cook 20 dishes from different cuisines", category: "Creative", isCompleted: false, description: "At 13 dishes. Perfected Japanese ramen and Moroccan tagine." },
      { userId: carol.id, title: "Publish a travel photography book", category: "Creative", isCompleted: false, targetDate: new Date("2027-01-01"), description: "Have 400+ photos from 34 countries. Editing and curating." },
      { userId: carol.id, title: "Get into a consistent workout routine", category: "Health", isCompleted: true, completedAt: new Date("2024-06-01"), description: "Yoga every morning for 6 months straight." },
      { userId: carol.id, title: "Complete a digital detox for 2 weeks", category: "Health", isCompleted: false, targetDate: new Date("2025-08-01"), description: "Planning for the Camino walk — no phone except emergencies." },

      // ── Alice extra 24 ──────────────────────────────────────────
      { userId: alice.id, title: "Pass the AWS Solutions Architect exam", category: "Career", isCompleted: false, targetDate: new Date("2025-09-01"), description: "Studying with Adrian Cantrill's course. 200+ practice questions done." },
      { userId: alice.id, title: "Write a technical blog series (10+ posts)", category: "Career", isCompleted: true, completedAt: new Date("2024-08-01"), description: "Published 12 posts on component architecture. 15K total reads." },
      { userId: alice.id, title: "Contribute 10+ PRs to a major open-source project", category: "Career", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Currently contributing to the tRPC and Next.js ecosystems." },
      { userId: alice.id, title: "Learn Rust programming language", category: "Learning", isCompleted: false, description: "Started 'The Book'. Writing a CLI tool to practice ownership concepts." },
      { userId: alice.id, title: "Complete a 30-day coding challenge", category: "Career", isCompleted: true, completedAt: new Date("2023-10-31"), description: "Advent of Code 2023 — completed all 25 days. First time finishing!" },
      { userId: alice.id, title: "Mentor 3 junior developers", category: "Career", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Currently mentoring 2. Looking for a third via local bootcamp partnerships." },
      { userId: alice.id, title: "Get AWS/GCP cloud certification", category: "Career", isCompleted: false, targetDate: new Date("2026-03-01"), description: "Decided to go AWS first since it's more relevant to current role." },
      { userId: alice.id, title: "Publish a technical YouTube tutorial", category: "Creative", isCompleted: false, targetDate: new Date("2025-09-01"), description: "Planning a Next.js App Router + tRPC tutorial series." },
      { userId: alice.id, title: "Launch a SaaS side project", category: "Career", isCompleted: false, targetDate: new Date("2026-12-31"), description: "AI-assisted code review tool. Currently in early architecture phase." },
      { userId: alice.id, title: "Master touch typing at 100+ WPM", category: "Career", isCompleted: true, completedAt: new Date("2023-03-15"), description: "Switched to Colemak layout in 2022. Now averaging 112 WPM on keybr.com." },
      { userId: alice.id, title: "Complete a data science specialization", category: "Learning", isCompleted: false, description: "Enrolled in fast.ai course. Want to apply ML to code quality metrics." },
      { userId: alice.id, title: "Learn to play guitar (3 songs)", category: "Creative", isCompleted: false, description: "Have a Fender Stratocaster gathering dust. Starting with Blackbird." },
      { userId: alice.id, title: "Visit Antarctica", category: "Travel", isCompleted: false, description: "The final continent. Researching expedition cruises from Ushuaia." },
      { userId: alice.id, title: "Volunteer at a coding bootcamp", category: "Career", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Teaching one weekend a month at a local bootcamp when schedule allows." },
      { userId: alice.id, title: "Complete a triathlon (sprint distance)", category: "Health", isCompleted: false, targetDate: new Date("2026-06-01"), description: "Swimming is the weak leg. Training with a coach twice a week." },
      { userId: alice.id, title: "Write a novel (NaNoWriMo)", category: "Creative", isCompleted: false, description: "An AI-near-future thriller. 8,000 words written so far." },
      { userId: alice.id, title: "Cook through an entire cookbook", category: "Creative", isCompleted: true, completedAt: new Date("2024-10-20"), description: "Cooked every recipe in Salt, Fat, Acid, Heat. The chicken al mattone is now my signature." },
      { userId: alice.id, title: "Win a hackathon", category: "Career", isCompleted: true, completedAt: new Date("2022-11-20"), description: "First place at HackSF 2022. Built an accessible transit app in 24 hours." },
      { userId: alice.id, title: "Build a smart home automation system", category: "Career", isCompleted: false, description: "Home Assistant + custom Raspberry Pi sensors. 60% of the way there." },
      { userId: alice.id, title: "Plant a vegetable garden", category: "Health", isCompleted: false, description: "Renting a community garden plot. First season: tomatoes, basil, courgettes." },
      { userId: alice.id, title: "Reach 10K followers on a social platform", category: "Career", isCompleted: false, description: "At 4,200 on Twitter/X. Consistent posting strategy in progress." },
      { userId: alice.id, title: "Get to N3 level in Japanese", category: "Learning", isCompleted: false, targetDate: new Date("2026-01-01"), description: "Passed N4 after the Tokyo trip. N3 requires serious kanji study." },
      { userId: alice.id, title: "Read the complete works of Shakespeare", category: "Learning", isCompleted: false, description: "Done: Hamlet, Macbeth, King Lear, Midsummer Night's Dream. 33 to go." },
      { userId: alice.id, title: "Do a 10-day silent meditation retreat", category: "Health", isCompleted: false, targetDate: new Date("2025-11-01"), description: "Booked at a Vipassana centre. Phone-free, noble silence. Slightly terrified." },

      // ── Bob extra 24 ────────────────────────────────────────────
      { userId: bob.id, title: "Watch 1,000 films (lifetime tracker)", category: "Entertainment", isCompleted: false, description: "At 847 logged on Letterboxd. Closing in on the milestone." },
      { userId: bob.id, title: "Learn oil painting", category: "Creative", isCompleted: false, description: "Taking weekly evening classes. Currently working on landscapes." },
      { userId: bob.id, title: "Travel to Japan", category: "Travel", isCompleted: true, completedAt: new Date("2024-03-10"), description: "Tokyo and Kyoto in March 2024. Shibuya at midnight really is Blade Runner." },
      { userId: bob.id, title: "Complete a photography course", category: "Creative", isCompleted: true, completedAt: new Date("2023-09-01"), description: "6-month course at ICP. Now shooting on film. Composition has transformed my cinematography eye." },
      { userId: bob.id, title: "Enter the Nicholl Fellowships competition", category: "Career", isCompleted: false, targetDate: new Date("2025-07-01"), description: "Script is being polished. This is the most prestigious screenwriting competition." },
      { userId: bob.id, title: "Learn conversational Spanish", category: "Learning", isCompleted: false, targetDate: new Date("2026-06-01"), description: "Buenos Aires trip lit a fire. Italki sessions + Dreaming Spanish immersion." },
      { userId: bob.id, title: "Watch every Criterion Collection release", category: "Entertainment", isCompleted: false, description: "At 312/1100+. Spine #1 (Grand Illusion) already watched three times." },
      { userId: bob.id, title: "Build a home cinema projector setup", category: "Entertainment", isCompleted: true, completedAt: new Date("2023-08-15"), description: "4K laser projector, 120-inch screen, Dolby Atmos 7.1.4. Living the dream." },
      { userId: bob.id, title: "Write film reviews for 100 films on my blog", category: "Creative", isCompleted: false, description: "At 67 reviews published. Aiming for proper critical depth, not just summaries." },
      { userId: bob.id, title: "Master DaVinci Resolve video editing", category: "Career", isCompleted: false, targetDate: new Date("2025-06-01"), description: "Switched from Premiere. Color grading is the gap I'm closing currently." },
      { userId: bob.id, title: "Start a film podcast and reach 500 listeners", category: "Career", isCompleted: false, description: "Pilot episode recorded. Working on a co-host and consistent release schedule." },
      { userId: bob.id, title: "Create a film club in NYC", category: "Entertainment", isCompleted: false, description: "Starting small — 8 people, one film per month, proper discussion format." },
      { userId: bob.id, title: "Run a 5K without stopping", category: "Health", isCompleted: true, completedAt: new Date("2024-05-15"), description: "Did my first parkrun. 28:42. Not fast but consistent. Running weekly now." },
      { userId: bob.id, title: "Learn calligraphy", category: "Creative", isCompleted: false, description: "Italic hand calligraphy. Writing all my notes by hand first now." },
      { userId: bob.id, title: "Read all of Dostoevsky's major works", category: "Learning", isCompleted: false, description: "Done: C&P, The Idiot. Reading Brothers Karamazov now. Notes from Underground next." },
      { userId: bob.id, title: "Read Tolstoy's War and Peace", category: "Learning", isCompleted: false, description: "1,225 pages. The physical copy is sitting on my nightstand judging me." },
      { userId: bob.id, title: "Visit every US state", category: "Travel", isCompleted: false, description: "At 31/50. Need to hit the Dakotas, Wyoming, Montana, and most of the South." },
      { userId: bob.id, title: "Go skydiving", category: "Health", isCompleted: true, completedAt: new Date("2022-07-04"), description: "Tandem jump in Long Island. 60 seconds of freefall. Would do it again tomorrow." },
      { userId: bob.id, title: "Cook a 5-course dinner party for 8 people", category: "Creative", isCompleted: true, completedAt: new Date("2023-11-25"), description: "French bistro menu. Coq au vin, crème brûlée. Five stars from all guests." },
      { userId: bob.id, title: "Take an improv comedy class", category: "Creative", isCompleted: false, description: "Enrolled at Upright Citizens Brigade. Week 3 of 8. Terrifying and exhilarating." },
      { userId: bob.id, title: "Complete the NYC Marathon", category: "Health", isCompleted: false, targetDate: new Date("2026-11-01"), description: "Got a charity bib. Training plan starts in January. Goal: sub-4:30." },
      { userId: bob.id, title: "Produce a short documentary film", category: "Creative", isCompleted: false, targetDate: new Date("2026-09-01"), description: "Subject: the last remaining 35mm film laboratory in NYC. Funding in progress." },
      { userId: bob.id, title: "Achieve 500+ YouTube subscribers", category: "Creative", isCompleted: false, description: "Started film essay channel. 3 videos published, 187 subscribers so far." },
      { userId: bob.id, title: "Master chess (reach 1500 ELO)", category: "Learning", isCompleted: false, targetDate: new Date("2025-12-31"), description: "At 1,180 on Chess.com. Studying endgames and improving opening repertoire." },

      // ── Carol extra 24 ──────────────────────────────────────────
      { userId: carol.id, title: "Visit all 7 continents", category: "Travel", isCompleted: false, description: "Have 6: North America, South America, Europe, Africa, Asia, Oceania. Antarctica is next." },
      { userId: carol.id, title: "Learn Mandarin Chinese (beginner level)", category: "Learning", isCompleted: false, description: "HSK 1 goal first. Having a tutor once a week via italki." },
      { userId: carol.id, title: "Do a 10-day Vipassana meditation retreat", category: "Health", isCompleted: false, targetDate: new Date("2025-11-01"), description: "Noble silence for 10 days. Phone-free. Simultaneously terrifying and exciting." },
      { userId: carol.id, title: "Build a portfolio website and case studies", category: "Career", isCompleted: true, completedAt: new Date("2023-07-01"), description: "Launched carolwilliams.design with 8 case studies. Tripled inbound inquiries." },
      { userId: carol.id, title: "Get featured on Awwwards or Behance", category: "Career", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Submitted my travel app redesign concept. Awaiting jury review." },
      { userId: carol.id, title: "Hike a section of the Appalachian Trail", category: "Health", isCompleted: false, description: "Planning the Smokies section in April. Training hikes every weekend." },
      { userId: carol.id, title: "Learn pottery from scratch", category: "Creative", isCompleted: false, description: "Enrolled in a 10-week wheel-throwing class at a local studio." },
      { userId: carol.id, title: "Volunteer teaching design at a school abroad", category: "Career", isCompleted: false, description: "Exploring opportunities in Southeast Asia for a month-long stint." },
      { userId: carol.id, title: "Complete a 50K ultramarathon", category: "Health", isCompleted: false, targetDate: new Date("2026-09-01"), description: "Building base mileage. Trail running every weekend in the Texas Hill Country." },
      { userId: carol.id, title: "Write and illustrate a children's book", category: "Creative", isCompleted: false, targetDate: new Date("2027-01-01"), description: "About a little girl who travels the world through her grandmother's stories." },
      { userId: carol.id, title: "Swim in 5 different oceans or seas", category: "Travel", isCompleted: false, description: "Done: Pacific, Indian, Mediterranean, Atlantic. One more to go (Arctic?!)." },
      { userId: carol.id, title: "Get a drone pilot license", category: "Creative", isCompleted: false, description: "FAA Part 107 exam. Want to take aerial travel photography to another level." },
      { userId: carol.id, title: "Attend Burning Man", category: "Travel", isCompleted: false, description: "Getting my ticket. Planning a travel-themed art installation for our camp." },
      { userId: carol.id, title: "Complete a culinary arts intensive", category: "Creative", isCompleted: true, completedAt: new Date("2024-03-15"), description: "5-day course at Le Cordon Bleu London. French sauces and pastry fundamentals." },
      { userId: carol.id, title: "Visit the Pyramids of Giza", category: "Travel", isCompleted: false, description: "Egypt is on the list for 2026. Adding Petra and the Sahara to the same trip." },
      { userId: carol.id, title: "Photograph the Northern Lights", category: "Travel", isCompleted: false, targetDate: new Date("2025-12-31"), description: "Iceland in January. 72-hour window booked. Long-exposure photography practised." },
      { userId: carol.id, title: "Grow a travel blog to 10K monthly readers", category: "Creative", isCompleted: false, description: "Currently at 3,800 monthly readers. Publishing 3x per week consistently." },
      { userId: carol.id, title: "Host a monthly international supper club", category: "Creative", isCompleted: false, description: "One country's cuisine per month. Albania was the last one — burek and tave kosi." },
      { userId: carol.id, title: "Complete the Everest Base Camp Trek", category: "Travel", isCompleted: false, targetDate: new Date("2027-10-01"), description: "5,364m. Building altitude tolerance with hikes in Patagonia and the Rockies." },
      { userId: carol.id, title: "Get PADI open water SCUBA certification", category: "Health", isCompleted: true, completedAt: new Date("2022-08-20"), description: "Certified in Bali. First dive: Mola Mola (ocean sunfish). Absolutely magical." },
      { userId: carol.id, title: "Walk 10,000 steps daily for an entire year", category: "Health", isCompleted: false, description: "274-day streak so far. Travel days are the hardest to maintain." },
      { userId: carol.id, title: "Design and sell a digital product (font or template pack)", category: "Career", isCompleted: false, targetDate: new Date("2025-06-30"), description: "Working on a travel photography Lightroom preset pack. Launching on Gumroad." },
      { userId: carol.id, title: "Do a 3-month digital nomad stint in Southeast Asia", category: "Travel", isCompleted: false, targetDate: new Date("2026-06-01"), description: "Planning Chiang Mai → Bali → Lisbon. Airbnb's remote work policy makes this possible." },
      { userId: carol.id, title: "Document 100 recipes from my travels", category: "Creative", isCompleted: false, description: "At 67 recipes. Each one has a story and a photo from where I learned it." },
    ],
  })

  console.log("✅ Seeded:")
  console.log("   3 users + follows + experiences + educations + skills")
  console.log("   5 posts + likes")
  console.log("   102 books (34 per user)")
  console.log("   102 movies/shows (34 per user)")
  console.log("   102 places (34 per user)")
  console.log("   102 goals (34 per user)")
  console.log("\nDemo accounts (password: Password1):")
  console.log("  alice@example.com  — @alice  (verified)")
  console.log("  bob@example.com    — @bob")
  console.log("  carol@example.com  — @carol")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
