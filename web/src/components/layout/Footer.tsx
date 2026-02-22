import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, Github, Linkedin, Fish } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-sidebar text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="text-lg font-semibold">DaingGrader</div>
          <p className="text-sm text-white/70 mt-2">
            An AI-powered dried fish quality grading platform developed for classification, quality assessment, and dataset management.
          </p>
          <p className="text-sm text-white/70 mt-3">
            Built as a thesis project at the Technological University of the Philippines - Taguig, our mission is to revolutionize dried fish quality control using machine learning.
          </p>
        </div>
        <div>
          <div className="font-semibold text-white/90">Quick Links</div>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link to="/" className="hover:text-white transition-colors duration-200">Home</Link>
            </li>
            <li>
              <Link to="/grade" className="hover:text-white transition-colors duration-200">Grade</Link>
            </li>
            <li>
              <Link to="/history" className="hover:text-white transition-colors duration-200">History</Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors duration-200">About Us</Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors duration-200">Contact Us</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white/90 flex items-center gap-2">
            <Fish className="w-4 h-4" />
            About Daing
          </div>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link to="/about-daing/espada" className="hover:text-white transition-colors duration-200">Espada</Link>
            </li>
            <li>
              <Link to="/about-daing/danggit" className="hover:text-white transition-colors duration-200">Danggit</Link>
            </li>
            <li>
              <Link to="/about-daing/dalagang-bukid" className="hover:text-white transition-colors duration-200">Dalagang Bukid</Link>
            </li>
            <li>
              <Link to="/about-daing/flying-fish" className="hover:text-white transition-colors duration-200">Flying Fish</Link>
            </li>
            <li>
              <Link to="/about-daing/bisugo" className="hover:text-white transition-colors duration-200">Bisugo</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white/90">Contact</div>
          <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
            <Mail className="w-4 h-4 shrink-0" />
            <a href="mailto:shathesisgroup@gmail.com" className="hover:text-white transition-colors duration-200">
              shathesisgroup@gmail.com
            </a>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
            <Phone className="w-4 h-4 shrink-0" />
            <a href="tel:09611676764" className="hover:text-white transition-colors duration-200">
              09611676764
            </a>
          </div>
          <div className="mt-3 flex gap-3">
            <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200" aria-label="GitHub">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200" aria-label="LinkedIn">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-sm py-4 text-white/60">
        © {new Date().getFullYear()} DaingGrader — Technological University of the Philippines - Taguig
      </div>
    </footer>
  )
}
