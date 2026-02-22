import React from 'react'
import { teamMembers, tupInfo } from '../data/team'
import { Github, Facebook, Instagram, Mail, Phone, User } from 'lucide-react'

export default function AboutUsPage() {
  return (
    <div className="space-y-12 bg-gradient-to-b from-blue-50/80 to-white pb-16">
      {/* About TUP - full width section */}
      <section className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-blue-50 border-y border-blue-100 py-12 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <img
            src={tupInfo.logo}
            alt={tupInfo.name}
            className="h-24 w-auto object-contain rounded-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">{tupInfo.name}</h2>
            <p className="text-slate-600 mt-2">{tupInfo.description}</p>
          </div>
        </div>
      </section>

      {/* Team Cards: Grid adapts to 4 columns on large screens */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-2xl shadow-card overflow-visible border border-black/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            {/* Image: circular placeholder (square/2x2 ratio), border */}
            <div className="relative w-36 h-36 -mt-8 mx-auto rounded-full overflow-hidden border-4 border-blue-100 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover object-center hover-zoom"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.onerror = null
                  target.src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#e2e8f0" width="400" height="400"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="48">?</text></svg>'
                    )
                }}
              />
            </div>

            {/* Number band (like 01, 02, 03, 04) */}
            <div className="bg-blue-100 text-blue-700 font-bold text-sm px-4 py-2 mt-4 mx-4 rounded-lg w-fit">
              {member.id.padStart(2, '0')}
            </div>

            {/* Text content */}
            <div className="p-4 pt-2 space-y-3">
              <h3 className="text-lg font-bold text-slate-900 font-display leading-tight">{member.name}</h3>
              <p className="text-blue-700 font-medium text-sm">{member.role}</p>
              <p className="text-slate-600 text-sm leading-relaxed">{member.bio}</p>

              {/* Age & contact - organized */}
              <div className="space-y-2 text-sm">
                {member.age != null && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4 text-blue-300 shrink-0" />
                    <span>Age: {member.age}</span>
                  </div>
                )}
                {member.contactNumber && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-blue-300 shrink-0" />
                    <a href={`tel:${member.contactNumber.replace(/\s/g, '')}`} className="hover:text-blue-700 transition-colors">
                      {member.contactNumber}
                    </a>
                  </div>
                )}
              </div>

              {/* Social: icon + handle text */}
              <div className="flex flex-wrap gap-3 pt-2">
                {member.github && (
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-slate-900 hover:bg-blue-100 hover:shadow-md transition-all duration-200 text-sm"
                    aria-label="GitHub"
                  >
                    <Github className="w-4 h-4 shrink-0" />
                    <span>{member.githubHandle || 'GitHub'}</span>
                  </a>
                )}
                {member.facebook && (
                  <a
                    href={member.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-slate-900 hover:bg-blue-100 hover:shadow-md transition-all duration-200 text-sm"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-4 h-4 shrink-0" />
                    <span>{member.facebookHandle || 'Facebook'}</span>
                  </a>
                )}
                {member.instagram && (
                  <a
                    href={member.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-slate-900 hover:bg-blue-100 hover:shadow-md transition-all duration-200 text-sm"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4 shrink-0" />
                    <span>{member.instagramHandle || 'Instagram'}</span>
                  </a>
                )}
                {member.gmail && (
                  <a
                    href={`mailto:${member.gmail}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-slate-900 hover:bg-blue-100 hover:shadow-md transition-all duration-200 text-sm"
                    aria-label="Gmail"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{member.gmailHandle || 'Email'}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}