import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogIn, User, UserPlus, LogOut, ShoppingCart, Heart, Truck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

/**
 * Website title arrangement (left side): TUP-T Logo | DaingGrader Logo | DaingGrader
 * Where to put logo image files:
 *   - TUP-T logo:  public/assets/logos/tup-t-logo.png   → use src="/assets/logos/tup-t-logo.png"
 *   - DaingGrader logo:  public/assets/logos/dainggrader-logo.png   → use src="/assets/logos/dainggrader-logo.png"
 */

export default function Header() {
  const { isLoggedIn, user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const role = user?.role ?? 'user'

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    showToast('Logging out...')
    logout()
    navigate('/')
  }

  return (
    <header className="bg-surface border-b border-slate-200/80 sticky top-0 z-20 shadow-soft">
      <div className="flex items-end justify-between h-14 pl-14 pr-4 lg:pl-6 pb-1">
        {/* TUP Logo - Separate, links to external site */}
        <a
          href="https://www.tup.edu.ph"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-end shrink-0"
          title="Visit TUP website"
        >
          <img src="/assets/logos/tup-t-logo.png" alt="TUP-T" className="h-10 w-auto" />
        </a>

        {/* DaingGrader Logo and branding */}
        <Link to="/" className="flex items-end gap-4 shrink-0 ml-4">
          <img src="/assets/logos/dainggrader-logo.png" alt="DaingGrader" className="h-10 w-auto" />
          <div className="hidden sm:block border-l border-slate-300 pl-4">
            <div className="text-lg font-semibold text-slate-800">DaingGrader</div>
            <div className="text-xs text-slate-500">Dried Fish Quality Grader</div>
          </div>
        </Link>

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
                  ${isActive ? 'text-white bg-blue-600 border-blue-600 shadow-md' : 'text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'}`
                }
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </NavLink>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
                  ${isActive ? 'text-white bg-blue-600 border-blue-600 shadow-md' : 'text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'}`
                }
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Up</span>
              </NavLink>
            </>
          ) : (
            <>
              {role === 'user' && (
                <>
                  <NavLink
                    to="/wishlist"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
                      ${isActive ? 'text-white bg-blue-600 border-blue-600 shadow-md' : 'text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'}`
                    }
                    title="Wishlist"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="hidden sm:inline">Wishlist</span>
                  </NavLink>
                  <NavLink
                    to="/orders"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
                      ${isActive ? 'text-white bg-blue-600 border-blue-600 shadow-md' : 'text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'}`
                    }
                    title="My Orders"
                  >
                    <Truck className="w-4 h-4" />
                    <span className="hidden sm:inline">Orders</span>
                  </NavLink>
                  <NavLink
                    to="/cart"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
                      ${isActive ? 'text-white bg-blue-600 border-blue-600 shadow-md' : 'text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'}`
                    }
                    title="Shopping cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline">Cart</span>
                  </NavLink>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
              ${isActive ? 'text-white bg-blue-600 border-blue-600 shadow-md' : 'text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'}`
            }
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </NavLink>

          <div className="flex items-center gap-2">
            {/* Role badge - sharp clean design */}
            {isLoggedIn && user?.role && user.role !== 'user' && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 border border-black/20 bg-white text-xs font-semibold uppercase tracking-wide shadow-sm">
                {user.role === 'admin' ? (
                  <span className="text-red-600">Admin</span>
                ) : (
                  <span className="text-blue-600">Seller</span>
                )}
              </span>
            )}
            <div
              className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm border border-primary/30 overflow-hidden flex-shrink-0"
              title="User avatar"
            >
              {isLoggedIn && user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{isLoggedIn ? (user?.name?.charAt(0)?.toUpperCase() || 'U') : '?'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
