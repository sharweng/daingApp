import React, { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  BookOpen,
  Mail,
  ChevronDown,
  Menu,
  X,
  FileText,
  ScanLine,
  History,
  User,
  LogIn,
  LogOut,
  MessageCircle,
  ShoppingBag,
  LayoutDashboard,
  Settings,
  Package,
  ClipboardList,
  Star,
  Store,
  Grid,
  Heart,
  Truck,
  Info,
  HelpCircle,
  Gift,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const SIDEBAR_LOGO_SRC = '/assets/logos/dainggrader-logo.png'

// Main navigation items
const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/', label: 'Home', icon: Home },
  { to: '/grade', label: 'Grade', icon: ScanLine },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
]

// Market dropdown items
const marketItems = [
  { to: '/catalog', label: 'Product Catalog', icon: Grid },
  { to: '/sellers', label: 'Stores', icon: Store },
  { to: '/wishlist', label: 'Wishlist', icon: Heart, roles: ['user'] },
  { to: '/orders', label: 'Orders', icon: Truck, roles: ['user'] },
  { to: '/cart', label: 'Cart', icon: ShoppingBag, roles: ['user'] },
]

// Information dropdown items (About Daing types)
const aboutDaingItems = [
  { to: '/about-daing/espada', label: 'Espada' },
  { to: '/about-daing/danggit', label: 'Danggit' },
  { to: '/about-daing/dalagang-bukid', label: 'Dalagang Bukid' },
  { to: '/about-daing/flying-fish', label: 'Flying Fish' },
  { to: '/about-daing/bisugo', label: 'Bisugo' },
]

// Information dropdown items (Publications)
const publicationItems = [
  { to: '/publications/local', label: 'Local' },
  { to: '/publications/foreign', label: 'Foreign' },
]

// Support dropdown items
const supportItems = [
  { to: '/about', label: 'About Us', icon: Users },
  { to: '/contact', label: 'Contact Us', icon: Mail },
  { to: '/forum', label: 'Community Forum', icon: MessageCircle },
]

// Seller Panel items
const sellerPanelItems = [
  { to: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/orders', label: 'Orders', icon: ClipboardList },
  { to: '/seller/reviews', label: 'Reviews', icon: Star },
  { to: '/seller/discounts', label: 'Vouchers', icon: Gift },
  { to: '/seller/earnings', label: 'Earnings', icon: DollarSign },
]

// Management items (Admin only)
const managementItems = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/posts', label: 'Community Posts' },
  { to: '/admin/scans', label: 'Scans' },
  { to: '/admin/audit-logs', label: 'Audit Logs' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/discounts', label: 'Vouchers' },
  { to: '/admin/payouts', label: 'Payouts' },
]

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { isLoggedIn, logout, user } = useAuth()
  const navigate = useNavigate()
  
  // Dropdown states
  const [marketOpen, setMarketOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [aboutDaingOpen, setAboutDaingOpen] = useState(false)
  const [publicationsOpen, setPublicationsOpen] = useState(false)
  const [managementOpen, setManagementOpen] = useState(false)
  const [sellerPanelOpen, setSellerPanelOpen] = useState(false)
  
  const role = user?.role ?? 'user'
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(role))
  const visibleMarketItems = marketItems.filter((item) => !item.roles || item.roles.includes(role))

  // Auto-close other dropdowns when one opens
  const handleDropdownToggle = (dropdownName: string) => {
    // Check if this is a sub-dropdown (About Daing or Publications under Information)
    const isSubDropdown = ['aboutDaing', 'publications'].includes(dropdownName)
    
    if (!isSubDropdown) {
      // For top-level dropdowns, close all others
      if (dropdownName !== 'market') setMarketOpen(false)
      if (dropdownName !== 'info') setInfoOpen(false)
      if (dropdownName !== 'support') setSupportOpen(false)
      if (dropdownName !== 'management') setManagementOpen(false)
      if (dropdownName !== 'sellerPanel') setSellerPanelOpen(false)
    } else {
      // For sub-dropdowns, close all top-level dropdowns but keep the parent info open
      setMarketOpen(false)
      setSupportOpen(false)
      setManagementOpen(false)
      setSellerPanelOpen(false)
      
      // Close other sub-dropdowns
      if (dropdownName !== 'aboutDaing') setAboutDaingOpen(false)
      if (dropdownName !== 'publications') setPublicationsOpen(false)
    }

    // Toggle the selected dropdown
    switch (dropdownName) {
      case 'market': setMarketOpen(!marketOpen); break
      case 'info': setInfoOpen(!infoOpen); break
      case 'support': setSupportOpen(!supportOpen); break
      case 'aboutDaing': setAboutDaingOpen(!aboutDaingOpen); break
      case 'publications': setPublicationsOpen(!publicationsOpen); break
      case 'management': setManagementOpen(!managementOpen); break
      case 'sellerPanel': setSellerPanelOpen(!sellerPanelOpen); break
    }
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation()
    logout()
    onOpenChange(false)
    navigate('/')
  }

  const handleSidebarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open) onOpenChange(true)
  }

  return (
    <>
      {/* Mobile overlay when sidebar is open */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Sidebar: fixed so it doesn't scroll; click anywhere to open when closed */}
      <aside
        onClick={handleSidebarClick}
        className={`
          fixed top-0 left-0 z-50 flex h-screen cursor-pointer lg:cursor-default
          bg-sidebar text-white
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${open ? 'translate-x-0 w-64 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'}
        `}
      >
        <div className="flex flex-col min-h-screen flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10 lg:border-0 shrink-0">
            {open ? (
              <Link to="/" className="flex items-center gap-3 min-w-0" onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}>
                <img src={SIDEBAR_LOGO_SRC} alt="DaingGrader" className="h-10 w-10 object-contain shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">DaingGrader</div>
                  <div className="text-xs text-white/70 truncate">Dried Fish Quality Grader</div>
                </div>
              </Link>
            ) : (
              /* Logo always visible when sidebar is closed - click to open */
              <Link
                to="/"
                className="mx-auto flex items-center justify-center w-full py-3 rounded-lg transition-all duration-200 hover:bg-white/10 hover:shadow-md"
                onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                title="DaingGrader - click to open menu"
              >
                <img src={SIDEBAR_LOGO_SRC} alt="DaingGrader" className="h-10 w-10 object-contain" />
              </Link>
            )}
            <button
              className="p-2 rounded-lg hover:bg-sidebar-hover transition-colors lg:hidden shrink-0"
              onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* When open: full nav with labels and dropdowns */}
          {open && (
            <nav className="flex-1 overflow-y-auto py-4 overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 space-y-0.5">
                {/* Main navigation items */}
                {visibleNavItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => onOpenChange(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive ? 'bg-sidebar-active-bg text-white border-l-2 border-sidebar-active' : 'text-white/90 hover:bg-sidebar-hover hover:text-white'}`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0 opacity-90" />
                    <span>{label}</span>
                  </NavLink>
                ))}

                {/* Market dropdown */}
                {visibleMarketItems.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleDropdownToggle('market')}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white"
                    >
                      <ShoppingBag className="w-5 h-5 shrink-0 opacity-90" />
                      <span className="flex-1 text-left">Market</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${marketOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {marketOpen && (
                      <div className="mt-1 ml-4 space-y-0.5 border-l border-white/20 pl-3">
                        {visibleMarketItems.map(({ to, label, icon: Icon }) => (
                          <NavLink
                            key={to}
                            to={to}
                            onClick={() => onOpenChange(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200
                              ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/85 hover:bg-sidebar-hover'}`
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0 opacity-90" />
                            {label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Information dropdown */}
                <div className="pt-2">
                  <button
                    onClick={() => handleDropdownToggle('info')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white"
                  >
                    <Info className="w-5 h-5 shrink-0 opacity-90" />
                    <span className="flex-1 text-left">Information</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${infoOpen ? '' : '-rotate-90'}`} />
                  </button>
                  {infoOpen && (
                    <div className="mt-1 ml-4 space-y-1">
                      {/* About Daing sub-dropdown */}
                      <button
                        onClick={() => handleDropdownToggle('aboutDaing')}
                        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm transition-all duration-200 text-white/85 hover:bg-sidebar-hover"
                      >
                        <BookOpen className="w-4 h-4 shrink-0 opacity-90" />
                        <span className="flex-1 text-left">About Daing</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${aboutDaingOpen ? '' : '-rotate-90'}`} />
                      </button>
                      {aboutDaingOpen && (
                        <div className="ml-4 space-y-0.5 border-l border-white/20 pl-3">
                          {aboutDaingItems.map(({ to, label }) => (
                            <NavLink
                              key={to}
                              to={to}
                              onClick={() => onOpenChange(false)}
                              className={({ isActive }) =>
                                `block px-2 py-1.5 rounded-lg text-sm transition-all duration-200
                                ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/85 hover:bg-sidebar-hover'}`
                              }
                            >
                              {label}
                            </NavLink>
                          ))}
                        </div>
                      )}

                      {/* Publications sub-dropdown */}
                      <button
                        onClick={() => handleDropdownToggle('publications')}
                        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm transition-all duration-200 text-white/85 hover:bg-sidebar-hover"
                      >
                        <FileText className="w-4 h-4 shrink-0 opacity-90" />
                        <span className="flex-1 text-left">Publications</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${publicationsOpen ? '' : '-rotate-90'}`} />
                      </button>
                      {publicationsOpen && (
                        <div className="ml-4 space-y-0.5 border-l border-white/20 pl-3">
                          {publicationItems.map(({ to, label }) => (
                            <NavLink
                              key={to}
                              to={to}
                              onClick={() => onOpenChange(false)}
                              className={({ isActive }) =>
                                `block px-2 py-1.5 rounded-lg text-sm transition-all duration-200
                                ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/85 hover:bg-sidebar-hover'}`
                              }
                            >
                              {label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Support dropdown */}
                <div className="pt-2">
                  <button
                    onClick={() => handleDropdownToggle('support')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white"
                  >
                    <HelpCircle className="w-5 h-5 shrink-0 opacity-90" />
                    <span className="flex-1 text-left">Support</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${supportOpen ? '' : '-rotate-90'}`} />
                  </button>
                  {supportOpen && (
                    <div className="mt-1 ml-4 space-y-0.5 border-l border-white/20 pl-3">
                      {supportItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => onOpenChange(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200
                            ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/85 hover:bg-sidebar-hover'}`
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0 opacity-90" />
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seller Panel dropdown - Seller only */}
                {role === 'seller' && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleDropdownToggle('sellerPanel')}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white"
                    >
                      <LayoutDashboard className="w-5 h-5 shrink-0 opacity-90" />
                      <span className="flex-1 text-left">Seller Panel</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${sellerPanelOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {sellerPanelOpen && (
                      <div className="mt-1 ml-4 space-y-0.5 border-l border-white/20 pl-3">
                        {sellerPanelItems.map(({ to, label, icon: Icon }) => (
                          <NavLink
                            key={to}
                            to={to}
                            onClick={() => onOpenChange(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200
                              ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/85 hover:bg-sidebar-hover'}`
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0 opacity-90" />
                            {label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Management dropdown - Admin only */}
                {role === 'admin' && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleDropdownToggle('management')}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white"
                    >
                      <Settings className="w-5 h-5 shrink-0 opacity-90" />
                      <span className="flex-1 text-left">Management</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${managementOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {managementOpen && (
                      <div className="mt-1 ml-4 space-y-0.5 border-l border-white/20 pl-3">
                        {managementItems.map(({ to, label }) => (
                          <NavLink
                            key={to}
                            to={to}
                            onClick={() => onOpenChange(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200
                              ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/85 hover:bg-sidebar-hover'}`
                            }
                          >
                            {label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* When closed (lg only): icon-only buttons that only open sidebar (no nav yet) */}
          {!open && (
            <nav className="hidden lg:flex flex-1 flex-col items-center py-4 gap-1">
              {visibleNavItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white hover:scale-110"
                  title={label}
                >
                  <Icon className="w-5 h-5 shrink-0 opacity-90" />
                </Link>
              ))}
              
              {/* Market icon */}
              {visibleMarketItems.length > 0 && (
                <Link
                  to="/catalog"
                  onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white hover:scale-110"
                  title="Market"
                >
                  <ShoppingBag className="w-5 h-5 shrink-0 opacity-90" />
                </Link>
              )}
              
              {/* Information icon */}
              <Link
                to="/about-daing/espada"
                onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white hover:scale-110"
                title="Information"
              >
                <Info className="w-5 h-5 shrink-0 opacity-90" />
              </Link>
              
              {/* Support icon */}
              <Link
                to="/about"
                onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white hover:scale-110"
                title="Support"
              >
                <HelpCircle className="w-5 h-5 shrink-0 opacity-90" />
              </Link>
              
              {/* Seller Panel icon */}
              {role === 'seller' && (
                <Link
                  to="/seller/dashboard"
                  onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white hover:scale-110"
                  title="Seller Panel"
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0 opacity-90" />
                </Link>
              )}
              
              {/* Management icon */}
              {role === 'admin' && (
                <Link
                  to="/admin/users"
                  onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 text-white/90 hover:bg-sidebar-hover hover:text-white hover:scale-110"
                  title="Management"
                >
                  <Settings className="w-5 h-5 shrink-0 opacity-90" />
                </Link>
              )}
            </nav>
          )}

          {/* Bottom: Login or Logout depending on auth status */}
          <div className="border-t border-white/10 pt-3 mt-auto shrink-0" onClick={(e) => e.stopPropagation()}>
            {open ? (
              isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-sidebar-hover hover:text-white transition-all duration-200"
                >
                  <LogOut className="w-5 h-5 shrink-0 opacity-90" />
                  <span>Logout</span>
                </button>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => onOpenChange(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive ? 'bg-sidebar-active-bg text-white' : 'text-white/90 hover:bg-sidebar-hover hover:text-white'}`
                  }
                >
                  <LogIn className="w-5 h-5 shrink-0 opacity-90" />
                  <span>Login</span>
                </NavLink>
              )
            ) : (
              isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-white/90 hover:bg-sidebar-hover hover:text-white transition-all duration-200 mx-auto"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 shrink-0 opacity-90" />
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={(e) => { e.stopPropagation(); onOpenChange(true); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-white/90 hover:bg-sidebar-hover hover:text-white transition-all duration-200 mx-auto"
                  title="Login"
                >
                  <LogIn className="w-5 h-5 shrink-0 opacity-90" />
                </Link>
              )
            )}
          </div>
        </div>
      </aside>

      {/* Mobile menu button (hamburger) */}
      <button
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-sidebar text-white shadow-soft lg:hidden"
        onClick={() => onOpenChange(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  )
}
