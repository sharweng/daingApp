/**
 * About Us: 3 project members + TUP section.
 *
 * WHERE TO SAVE PROFILE IMAGES:
 * Put member photos in:  public/assets/team/
 * Filenames:  member1.jpg, member2.jpg, member3.jpg  (or .png)
 * Recommended size: 400x400 px or square aspect ratio.
 *
 * WHERE TO CHANGE MEMBER INFO:
 * Edit the objects below: name, role, bio, age, contactNumber, image path, and social URLs/handles.
 * For social: set URL (e.g. github) and display handle (e.g. githubHandle '@username') or '' to hide.
 * For Gmail: set gmail to the email address (e.g. 'john@gmail.com'); gmailHandle for custom display.
 */

export interface TeamMember {
  id: string
  /** Change: full name */
  name: string
  /** Change: role e.g. "Lead Developer", "Researcher" */
  role: string
  /** Change: short bio (1-2 sentences) */
  bio: string
  /** Change: age (number) or leave empty */
  age?: number
  /** Change: contact number string or '' */
  contactNumber?: string
  /** Image path - use /assets/team/member1.jpg if file is public/assets/team/member1.jpg */
  image: string
  /** Change: GitHub profile URL or '' */
  github: string
  /** Change: display e.g. '@username' shown next to GitHub icon */
  githubHandle?: string
  /** Change: Facebook profile URL or '' */
  facebook: string
  /** Change: display e.g. '@username' next to Facebook icon */
  facebookHandle?: string
  /** Change: Instagram profile URL or '' */
  instagram: string
  /** Change: display e.g. '@username' next to Instagram icon */
  instagramHandle?: string
  /** Change: Gmail/email address or '' */
  gmail?: string
  /** Change: display e.g. 'john@gmail.com' next to Gmail icon */
  gmailHandle?: string
}

export interface TUPInfo {
  /** Change: full institution name */
  name: string
  /** Change: brief description of TUP */
  description: string
  /** Logo path - same location as header: public/assets/logos/tup-t-logo.png */
  logo: string
}

/** Change: update names, roles, bios, age, contactNumber, and social links/handles for each member */
export const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Pops V. Madriaga',
    role: 'Research Advisor',
    bio: 'Experienced Research Advisor providing technical guidance and mentoring to students, fostering academic excellence and innovation in IT.',
    // age: left undefined as requested (unknown)
    contactNumber: '09611676764',
    image: '/assets/team/eaad_madriaga_p.jfif', // Ensure this file exists in your public folder
    github: 'popsmadriaga',
    githubHandle: '',
    facebook: 'Pops V. Madriaga',
    facebookHandle: '',
    instagram: 'Pops V. Madriaga',
    instagramHandle: '',
    gmail: 'Pops@gmail.com',
    gmailHandle: '',
  },
  {
    id: '2',
    name: 'John Neo Bagon',
    role: '3rd-Year BS in Information Technology Student',
    bio: 'BSIT student focused on turning ideas into functional technology.',
    age: 20,
    contactNumber: '09611676764',
    image: '/assets/team/member1.jfif',
    github: 'jxhnxugh',
    githubHandle: '',
    facebook: 'John Neo Bagon',
    facebookHandle: '',
    instagram: 'nxogh.13',
    instagramHandle: '',
    gmail: 'johnbagon4@gmail.com',
    gmailHandle: '',
  },
  {
    id: '3',
    name: 'Ernz Llabore Jumoc',
    role: '3rd-Year BS in Information Technology Student',
    bio: 'BSIT student exploring code, systems, and real-world tech solutions.',
    age: 20,
    contactNumber: '09611676764',
    image: '/assets/team/member2.jpg',
    github: 'ernzjumoc',
    githubHandle: '',
    facebook: 'Ernz Llabore Jumoc',
    facebookHandle: '',
    instagram: 'ernzjumoc',
    instagramHandle: '',
    gmail: 'ernzjumoc@gmail.com',
    gmailHandle: '',
  },
  {
    id: '4',
    name: 'Sharwin John Marbella',
    role: '3rd-Year BS in Information Technology Student',
    bio: 'BSIT student with a passion for building practical, efficient software solutions.',
    age: 20,
    contactNumber: '09611676764',
    image: '/assets/team/member3.png',
    github: 'sharwinjohnmarbella',
    githubHandle: '',
    facebook: 'Sharwin John Marbella',
    facebookHandle: '',
    instagram: 'sharwinjohnmarbella',
    instagramHandle: '',
    gmail: 'sjmarbella@gmail.com',
    gmailHandle: '',
  },
]

/** Change: TUP name and description in src/data/team.ts */
export const tupInfo: TUPInfo = {
  name: 'Technological University of the Philippines - Taguig',
  description: 'A premier state university with recognized excellence in engineering and technology education at par with leading universities in the ASEAN region.',
  logo: '/assets/logos/tup-t-logo.png',
}