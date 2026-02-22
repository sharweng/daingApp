import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import DatasetPage from './pages/DatasetPage'
import DatasetImageDetailPage from './pages/DatasetImageDetailPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import AboutUsPage from './pages/AboutUsPage'
import AboutDaingTypePage from './pages/AboutDaingTypePage'
import GradePage from './pages/GradePage'
import HistoryPage from './pages/HistoryPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ContactPage from './pages/ContactPage'
import PublicationsPage from './pages/PublicationsPage'
import CommunityForumPage from './pages/CommunityForumPage'
import EcommercePage from './pages/EcommercePage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminDashboardPageNew from './pages/AdminDashboardPageNew'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminPostsPage from './pages/AdminPostsPage'
import AdminScansPage from './pages/AdminScansPage'
import AdminAuditLogsPage from './pages/AdminAuditLogsPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminDiscountsPage from './pages/AdminDiscountsPage'
import AdminPayoutsPage from './pages/AdminPayoutsPage'
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerReviewsPage from './pages/seller/SellerReviewsPage'
import SellerDiscountsPage from './pages/SellerDiscountsPage'
import SellerEarningsPage from './pages/SellerEarningsPage'
import ProductCatalogPage from './pages/ProductCatalogPage'
import ProductDetailPage from './pages/ProductDetailPage'
import WishlistPage from './pages/WishlistPage'
import SellerListingPage from './pages/SellerListingPage'
import StoreProfilePage from './pages/StoreProfilePage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import CheckoutAddressPage from './pages/CheckoutAddressPage'
import CheckoutPaymentPage from './pages/CheckoutPaymentPage'
import OrderConfirmedPage from './pages/OrderConfirmedPage'
import { useAuth } from './contexts/AuthContext'
import { useToast } from './contexts/ToastContext'

type Role = 'user' | 'seller' | 'admin'

function RoleRoute({ allowed, children }: { allowed: Role[]; children: React.ReactElement }) {
  const { isLoggedIn, isLoading, user } = useAuth()
  const { showToast } = useToast()
  const [accessDenied, setAccessDenied] = React.useState(false)
  const role = user?.role ?? 'user'

  // Show toast when access is denied
  useEffect(() => {
    if (!isLoading && isLoggedIn && !allowed.includes(role)) {
      const requiredRole = allowed.length === 1 ? allowed[0] : allowed.join(' or ')
      showToast(`🚫 Access Denied. ${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} Only`)
      setAccessDenied(true)
    }
  }, [isLoading, isLoggedIn, role, allowed, showToast])

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (isLoading) {
    return (
      <div className="card max-w-xl text-center py-12">
        <div className="text-slate-500">Loading access…</div>
      </div>
    )
  }

  if (!allowed.includes(role)) {
    return (
      <div className="card max-w-xl text-center py-12 border border-black/10 shadow-card">
        <div className="text-6xl mb-4">🚫</div>
        <div className="text-slate-700 font-semibold mb-2 text-xl">Access Denied</div>
        <div className="text-slate-500">
          This page is restricted to <span className="font-medium capitalize">{allowed.join(' or ')}</span> users only.
        </div>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/admin" element={<Layout><RoleRoute allowed={['admin']}><AdminDashboardPage /></RoleRoute></Layout>} />
      <Route path="/admin/new" element={<Layout><RoleRoute allowed={['admin']}><AdminDashboardPageNew /></RoleRoute></Layout>} />
      <Route path="/admin/users" element={<Layout><RoleRoute allowed={['admin']}><AdminUsersPage /></RoleRoute></Layout>} />
      <Route path="/admin/orders" element={<Layout><RoleRoute allowed={['admin']}><AdminOrdersPage /></RoleRoute></Layout>} />
      <Route path="/admin/posts" element={<Layout><RoleRoute allowed={['admin']}><AdminPostsPage /></RoleRoute></Layout>} />
      <Route path="/admin/scans" element={<Layout><RoleRoute allowed={['admin']}><AdminScansPage /></RoleRoute></Layout>} />
      <Route path="/admin/audit-logs" element={<Layout><RoleRoute allowed={['admin']}><AdminAuditLogsPage /></RoleRoute></Layout>} />
      <Route path="/admin/discounts" element={<Layout><RoleRoute allowed={['admin']}><AdminDiscountsPage /></RoleRoute></Layout>} />
      <Route path="/admin/payouts" element={<Layout><RoleRoute allowed={['admin']}><AdminPayoutsPage /></RoleRoute></Layout>} />
      <Route path="/grade" element={<Layout><GradePage /></Layout>} />
      <Route path="/history" element={<Layout><HistoryPage /></Layout>} />
      <Route path="/analytics" element={<Layout><RoleRoute allowed={['admin']}><AnalyticsPage /></RoleRoute></Layout>} />
      <Route path="/forum" element={<Layout><CommunityForumPage /></Layout>} />
      <Route path="/catalog" element={<Layout><ProductCatalogPage /></Layout>} />
      <Route path="/catalog/:id" element={<Layout><ProductDetailPage /></Layout>} />
      <Route path="/sellers" element={<Layout><SellerListingPage /></Layout>} />
      <Route path="/store/:sellerId" element={<Layout><StoreProfilePage /></Layout>} />
      <Route path="/wishlist" element={<Layout><RoleRoute allowed={['user']}><WishlistPage /></RoleRoute></Layout>} />
      <Route path="/cart" element={<Layout><RoleRoute allowed={['user']}><CartPage /></RoleRoute></Layout>} />
      <Route path="/checkout/address" element={<Layout><RoleRoute allowed={['user']}><CheckoutAddressPage /></RoleRoute></Layout>} />
      <Route path="/checkout/payment" element={<Layout><RoleRoute allowed={['user']}><CheckoutPaymentPage /></RoleRoute></Layout>} />
      <Route path="/order-confirmed" element={<Layout><RoleRoute allowed={['user']}><OrderConfirmedPage /></RoleRoute></Layout>} />
      <Route path="/order-confirmed/:orderId" element={<Layout><RoleRoute allowed={['user']}><OrderConfirmedPage /></RoleRoute></Layout>} />
      <Route path="/shop" element={<Layout><RoleRoute allowed={['user']}><EcommercePage /></RoleRoute></Layout>} />
      <Route path="/seller" element={<Navigate to="/seller/dashboard" replace />} />
      <Route path="/seller/dashboard" element={<Layout><RoleRoute allowed={['seller']}><SellerDashboardPage /></RoleRoute></Layout>} />
      <Route path="/seller/products" element={<Layout><RoleRoute allowed={['seller']}><SellerProductsPage /></RoleRoute></Layout>} />
      <Route path="/seller/orders" element={<Layout><RoleRoute allowed={['seller']}><SellerOrdersPage /></RoleRoute></Layout>} />
      <Route path="/seller/reviews" element={<Layout><RoleRoute allowed={['seller']}><SellerReviewsPage /></RoleRoute></Layout>} />
      <Route path="/seller/discounts" element={<Layout><RoleRoute allowed={['seller']}><SellerDiscountsPage /></RoleRoute></Layout>} />
      <Route path="/seller/earnings" element={<Layout><RoleRoute allowed={['seller']}><SellerEarningsPage /></RoleRoute></Layout>} />
      <Route path="/dataset" element={<Layout><DatasetPage /></Layout>} />
      <Route path="/dataset/:id" element={<Layout><DatasetImageDetailPage /></Layout>} />
      <Route path="/login" element={<Layout><LoginPage /></Layout>} />
      <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/orders" element={<Layout><RoleRoute allowed={['user']}><OrdersPage /></RoleRoute></Layout>} />
      <Route path="/about" element={<Layout><AboutUsPage /></Layout>} />
      <Route path="/about-daing" element={<Navigate to="/about-daing/espada" replace />} />
      <Route path="/about-daing/:slug" element={<Layout><AboutDaingTypePage /></Layout>} />
      <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
      <Route path="/publications" element={<Navigate to="/publications/local" replace />} />
      <Route path="/publications/local" element={<Layout><PublicationsPage type="local" /></Layout>} />
      <Route path="/publications/foreign" element={<Layout><PublicationsPage type="foreign" /></Layout>} />
    </Routes>
  )
}
