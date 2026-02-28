// Team data for About Us screen in mobile app
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  age?: number;
  contactNumber?: string;
  github?: string;
  facebook?: string;
  instagram?: string;
  email?: string;
}

export interface TUPInfo {
  name: string;
  description: string;
}

export const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Pops V. Madriaga",
    role: "Research Advisor",
    bio: "Experienced Research Advisor providing technical guidance and mentoring to students, fostering academic excellence and innovation in IT.",
    contactNumber: "09611676764",
    facebook: "Pops V. Madriaga",
    instagram: "Pops V. Madriaga",
  },
  {
    id: "2",
    name: "John Neo Bagon",
    role: "3rd-Year BS in Information Technology Student",
    bio: "BSIT student focused on turning ideas into functional technology.",
    age: 20,
    contactNumber: "09611676764",
    github: "jxhnxugh",
    facebook: "John Neo Bagon",
    instagram: "nxogh.13",
    email: "johnbagon4@gmail.com",
  },
  {
    id: "3",
    name: "Ernz Llabore Jumoc",
    role: "3rd-Year BS in Information Technology Student",
    bio: "BSIT student exploring code, systems, and real-world tech solutions.",
    age: 20,
    contactNumber: "09611676764",
    github: "ernzjumoc",
    facebook: "Ernz Llabore Jumoc",
    instagram: "ernzjumoc",
    email: "ernzjumoc@gmail.com",
  },
  {
    id: "4",
    name: "Sharwin John Marbella",
    role: "3rd-Year BS in Information Technology Student",
    bio: "BSIT student with a passion for building practical, efficient software solutions.",
    age: 20,
    contactNumber: "09611676764",
    github: "sharwinjohnmarbella",
    facebook: "Sharwin John Marbella",
    instagram: "sharwinjohnmarbella",
    email: "sjmarbella@gmail.com",
  },
];

export const tupInfo: TUPInfo = {
  name: "Technological University of the Philippines - Taguig",
  description:
    "A premier state university with recognized excellence in engineering and technology education at par with leading universities in the ASEAN region.",
};
