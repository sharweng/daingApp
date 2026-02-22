import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <div className="flex flex-1 min-h-0">
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        {/* Main content: left margin matches fixed sidebar width; click outside closes sidebar */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}
          onClick={() => setSidebarOpen(false)}
          role="main"
        >
          <Header />
          <main className="flex-1 px-4 py-6 lg:px-6 overflow-x-clip">
            <div className="max-w-[1250px] mx-auto">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default Layout
