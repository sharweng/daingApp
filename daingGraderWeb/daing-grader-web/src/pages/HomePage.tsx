import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import HeroCarousel from '../components/home/HeroCarousel'
import { getHistory, getCommunityPosts, getCatalogProducts, type HistoryEntry, type CommunityPost, type SellerProduct } from '../services/api'
import { publications } from '../data/publications'
import { ExternalLink, Loader2, Heart, MessageCircle, ArrowRight, ShoppingBag, Image as ImageIcon } from 'lucide-react'

const RECENT_SCANS_COUNT = 5
const FEATURED_PUBLICATIONS_COUNT = 5
const FEATURED_PRODUCTS_COUNT = 6

export default function HomePage() {
  const [recentScans, setRecentScans] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [featuredProducts, setFeaturedProducts] = useState<SellerProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then((entries) => setRecentScans(entries.slice(0, RECENT_SCANS_COUNT)))
      .catch(() => setRecentScans([]))
      .finally(() => setHistoryLoading(false))

    getCommunityPosts(1, 3)
      .then((res) => setCommunityPosts(res.posts || []))
      .catch(() => setCommunityPosts([]))
      .finally(() => setPostsLoading(false))

    const loadProducts = async () => {
      setProductsLoading(true)
      try {
        const res = await getCatalogProducts({ sort: 'latest', page: 1, page_size: FEATURED_PRODUCTS_COUNT })
        setFeaturedProducts(res.products || [])
      } catch {
        setFeaturedProducts([])
      } finally {
        setProductsLoading(false)
      }
    }
    loadProducts()
  }, [])

  const featuredPubs = publications.slice(0, FEATURED_PUBLICATIONS_COUNT)

  return (
    <div className="space-y-10">
      {/* Carousel: full width, no card/borders */}
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <HeroCarousel />
      </div>

      {/* Recent Scans - last 5 from history */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-b-2 border-primary pb-2 w-fit">
          Recent Scans
        </h2>
        {historyLoading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : recentScans.length === 0 ? (
          <p className="text-slate-500 py-8">No scans yet. Grade a dried fish image to see your recent scans here.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {recentScans.map((entry) => (
                <Link
                  key={entry.id}
                  to="/history"
                  className="group block border border-blue-200 overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-lg hover:border-blue-400 transition-all rounded-lg"
                >
                  <div className="aspect-square flex items-center justify-center bg-blue-100">
                    <img src={entry.url} alt={`Scan ${entry.timestamp}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 bg-gradient-to-b from-white to-blue-50">
                    <p className="text-xs text-slate-600 truncate" title={new Date(entry.timestamp).toLocaleString()}>
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              <Link to="/history" className="text-primary font-medium hover:underline">
                View all history →
              </Link>
            </p>
          </>
        )}
      </section>

      {/* Featured Publications */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 border-b-2 border-primary pb-2 w-fit">
          Featured Publications
        </h2>
        <div className="space-y-0 divide-y divide-slate-200">
          {featuredPubs.map((pub) => (
            <div key={pub.id} className="py-4 first:pt-0">
              <h3 className="font-semibold text-slate-900 text-base">{pub.title}</h3>
              {pub.authors && (
                <p className="text-sm text-slate-600 mt-0.5">{pub.authors}</p>
              )}
              <p className="text-sm text-slate-500 mt-1">
                {pub.publication}
                {pub.year && ` (${pub.year})`}
              </p>
              <a
                href={pub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2 hover:underline"
              >
                Read more →
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          <Link to="/publications/local" className="text-primary font-medium hover:underline">
            Local publications
          </Link>
          {' · '}
          <Link to="/publications/foreign" className="text-primary font-medium hover:underline">
            Foreign publications
          </Link>
        </p>
      </section>

      {/* Community Posts - Last 3 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 border-b-2 border-primary pb-2">
            Community Posts
          </h2>
          <Link to="/community" className="flex items-center gap-1 text-primary font-medium hover:underline text-sm">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {postsLoading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : communityPosts.length === 0 ? (
          <p className="text-slate-500 py-8">No community posts yet. Be the first to share!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {communityPosts.map((post) => (
              <Link
                key={post.id}
                to="/community"
                className="group block border border-blue-200 overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-lg hover:border-blue-400 transition-all rounded-lg"
              >
                {/* Post Image */}
                <div className="aspect-video bg-blue-100 overflow-hidden">
                  {post.images && post.images.length > 0 ? (
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                </div>
                {/* Post Content */}
                <div className="p-4 bg-gradient-to-b from-white to-blue-50">
                  <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold mb-2 rounded">
                    {post.category}
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{post.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{post.description}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{post.author_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Products - Latest */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 border-b-2 border-primary pb-2">
            Marketplace Products
          </h2>
          <Link to="/catalog" className="flex items-center gap-1 text-primary font-medium hover:underline text-sm">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {productsLoading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading products...
          </div>
        ) : featuredProducts.length === 0 ? (
          <p className="text-slate-500 py-8">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.map((product) => {
              const mainImage = product.images?.[product.main_image_index]?.url || product.images?.[0]?.url || ''
              return (
                <Link
                  key={product.id}
                  to={`/catalog/${product.id}`}
                  className="group block border border-blue-200 overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-lg hover:border-blue-400 transition-all rounded-lg"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-blue-100 overflow-hidden">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                        <ShoppingBag className="w-16 h-16 text-blue-300" />
                      </div>
                    )}
                  </div>
                  {/* Product Content */}
                  <div className="p-4 bg-gradient-to-b from-white to-blue-50">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">₱{product.price.toLocaleString()}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-200">
                      <span className="text-xs text-slate-500">{product.seller_name || 'Marketplace Seller'}</span>
                      <span className="text-xs text-blue-600 font-medium">
                        {product.stock_qty > 0 ? 'In stock' : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
