/**
 * Community Forum page with real backend integration.
 * Supports grid view and Netflix-style social feed view with horizontal carousels.
 * Features: edit, comments, image carousel with dots, page hero, sidebars.
 */
import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  X,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Send,
  Flame,
  TrendingUp,
  Lightbulb,
  Sparkles,
  ArrowUp,
  Users,
  FileText,
  Filter,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PageTitleHero from '../components/layout/PageTitleHero'
import {
  getCommunityPosts,
  createCommunityPost,
  toggleLikePost,
  deleteCommunityPost,
  editCommunityPost,
  getCommunityPost,
  addComment,
  deleteComment,
  getFeaturedPosts,
  getMostLikedPosts,
  getPostsByCategory,
  getCommunityStats,
  type CommunityPost,
  type CommunityComment,
  type CommunityStats,
} from '../services/api'
import { validatePostTitle, validatePostDescription, validateComment, censorBadWords } from '../utils/validation'

// Netflix-style Horizontal Carousel Component
function PostCarousel({ 
  title, 
  icon: Icon, 
  posts, 
  onPostClick, 
  onLike, 
  isLikedByUser 
}: { 
  title: string
  icon: React.ElementType
  posts: CommunityPost[]
  onPostClick: (post: CommunityPost) => void
  onLike: (postId: string) => void
  isLikedByUser: (post: CommunityPost) => boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', checkScroll)
    return () => { if (el) el.removeEventListener('scroll', checkScroll) }
  }, [posts])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const cardWidth = 220
    scrollRef.current.scrollBy({ left: dir === 'left' ? -cardWidth * 2 : cardWidth * 2, behavior: 'smooth' })
  }

  return (
    <div className="relative group/carousel">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      
      {posts.length === 0 ? (
        <div className="flex items-center justify-center py-8 bg-blue-50 border border-dashed border-blue-300 rounded-lg">
          <p className="text-sm text-blue-600">No posts available</p>
        </div>
      ) : (
        <>
          {/* Scroll buttons - Netflix style */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 mt-3 -translate-y-1/2 z-10 w-10 h-24 bg-blue-600/70 hover:bg-blue-700 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 rounded-l"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 mt-3 -translate-y-1/2 z-10 w-10 h-24 bg-blue-600/70 hover:bg-blue-700 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 rounded-r"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
          
          {/* Netflix-style Cards container */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => onPostClick(post)}
                className="flex-shrink-0 w-[200px] rounded-md overflow-hidden cursor-pointer group hover:scale-105 hover:z-10 transition-transform duration-200 relative border border-blue-200"
              >
                {/* Card Image - Netflix landscape style */}
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-800 rounded-md">
                  {post.images.length > 0 ? (
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                      <ImageIcon className="w-10 h-10 text-slate-500" />
                    </div>
                  )}
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Title overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <h4 className="font-bold text-white text-sm line-clamp-2 drop-shadow-lg">{post.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-white/80 text-xs">
                      <span className="flex items-center gap-1">
                        <Heart className={`w-3 h-3 ${isLikedByUser(post) ? 'fill-red-500 text-red-500' : ''}`} /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {post.comments_count}
                      </span>
                    </div>
                  </div>
                  
                  {/* Category badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-medium uppercase rounded">
                      {post.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function CommunityForumPage() {
  const { user, isLoggedIn } = useAuth()
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const postsPerPage = 12
  const totalPages = Math.max(1, Math.ceil(total / postsPerPage))

  // Create post modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('Discussion')
  const [newImages, setNewImages] = useState<File[]>([])
  const [creating, setCreating] = useState(false)
  const [createErrors, setCreateErrors] = useState<{ title?: string; description?: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit post modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editErrors, setEditErrors] = useState<{ title?: string; description?: string }>({})

  // Post detail modal with comments
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [postComments, setPostComments] = useState<CommunityComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [commentError, setCommentError] = useState<string>('')
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Netflix-style carousels: filtered by category + most liked
  const [categoryPosts, setCategoryPosts] = useState<CommunityPost[]>([])
  const [mostLikedPosts, setMostLikedPosts] = useState<CommunityPost[]>([])
  const [trendingPosts, setTrendingPosts] = useState<CommunityPost[]>([])
  const [loadingCarousels, setLoadingCarousels] = useState(false)
  const [feedCategory, setFeedCategory] = useState('All')

  // Community stats for right sidebar
  const [communityStats, setCommunityStats] = useState<CommunityStats>({ status: 'ok', total_users: 0, total_posts: 0, total_comments: 0 })

  // Fetch carousels and stats when entering feed view or changing filter category
  useEffect(() => {
    if (viewMode === 'feed') {
      fetchCarouselData()
      fetchCommunityStats()
    }
  }, [viewMode, feedCategory])

  const fetchCarouselData = async () => {
    setLoadingCarousels(true)
    try {
      const [categoryData, likedData, featuredData] = await Promise.all([
        getPostsByCategory(feedCategory, 7),
        getMostLikedPosts(7),
        getFeaturedPosts(5),
      ])
      console.log('Carousel data:', { categoryData, likedData, featuredData })
      setCategoryPosts(categoryData.posts || [])
      setMostLikedPosts(likedData.posts || [])
      setTrendingPosts(featuredData.trending || [])
    } catch (e) {
      console.error('Failed to load carousel data:', e)
    } finally {
      setLoadingCarousels(false)
    }
  }

  const fetchCommunityStats = async () => {
    try {
      const data = await getCommunityStats()
      setCommunityStats(data)
    } catch (e) {
      console.error('Failed to load community stats:', e)
    }
  }

  // Back to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fetch posts
  useEffect(() => {
    fetchPosts()
  }, [page, category, searchQuery])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCommunityPosts(page, postsPerPage, category, searchQuery)
      setPosts(data.posts || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError('Failed to load posts')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    // Validate title and description
    const titleValidation = validatePostTitle(newTitle)
    const descValidation = validatePostDescription(newDescription)
    
    const errors: { title?: string; description?: string } = {}
    if (!titleValidation.valid) errors.title = titleValidation.error
    if (!descValidation.valid) errors.description = descValidation.error
    
    setCreateErrors(errors)
    if (Object.keys(errors).length > 0) return
    
    setCreating(true)
    try {
      // Censor bad words before posting
      const cleanTitle = censorBadWords(newTitle.trim())
      const cleanDescription = censorBadWords(newDescription.trim())
      
      await createCommunityPost(cleanTitle, cleanDescription, newCategory, newImages)
      setShowCreateModal(false)
      setNewTitle('')
      setNewDescription('')
      setNewCategory('Discussion')
      setNewImages([])
      setCreateErrors({})
      setPage(1)
      fetchPosts()
    } catch (e) {
      alert('Failed to create post')
    } finally {
      setCreating(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!isLoggedIn) return
    try {
      const result = await toggleLikePost(postId)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes: result.likes, liked_by: result.liked ? [...p.liked_by, user?.id || ''] : p.liked_by.filter((id) => id !== user?.id) }
            : p
        )
      )
    } catch (e) {
      console.error('Failed to like post')
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try {
      await deleteCommunityPost(postId)
      fetchPosts()
    } catch (e) {
      alert('Failed to delete post')
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (newImages.length + files.length > 3) {
      alert('Maximum 3 images allowed')
      return
    }
    setNewImages((prev) => [...prev, ...files].slice(0, 3))
  }

  const removeImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index))
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' - ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const isLikedByUser = (post: CommunityPost) => {
    return user?.id ? post.liked_by.includes(user.id) : false
  }

  const canDelete = (post: CommunityPost) => {
    if (!user) return false
    return post.author_id === user.id || user.role === 'admin'
  }

  const canEdit = (post: CommunityPost) => {
    if (!user) return false
    return post.author_id === user.id
  }

  const openEditModal = (post: CommunityPost) => {
    setEditingPost(post)
    setEditTitle(post.title)
    setEditDescription(post.description)
    setEditCategory(post.category)
    setShowEditModal(true)
  }

  const handleEditPost = async () => {
    if (!editingPost) return
    
    // Validate title and description
    const titleValidation = validatePostTitle(editTitle)
    const descValidation = validatePostDescription(editDescription)
    
    const errors: { title?: string; description?: string } = {}
    if (!titleValidation.valid) errors.title = titleValidation.error
    if (!descValidation.valid) errors.description = descValidation.error
    
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return
    
    setIsEditing(true)
    try {
      // Censor bad words before updating
      const cleanTitle = censorBadWords(editTitle.trim())
      const cleanDescription = censorBadWords(editDescription.trim())
      
      await editCommunityPost(editingPost.id, cleanTitle, cleanDescription, editCategory)
      setShowEditModal(false)
      setEditingPost(null)
      setEditErrors({})
      fetchPosts()
    } catch (e) {
      alert('Failed to update post')
    } finally {
      setIsEditing(false)
    }
  }

  const openPostDetail = async (post: CommunityPost) => {
    setSelectedPost(post)
    setCarouselIndex(0)
    setLoadingComments(true)
    try {
      const data = await getCommunityPost(post.id)
      setPostComments(data.comments || [])
    } catch (e) {
      setPostComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const closePostDetail = () => {
    setSelectedPost(null)
    setPostComments([])
    setNewComment('')
  }

  const handleAddComment = async () => {
    if (!selectedPost) return
    
    // Validate comment
    const validation = validateComment(newComment)
    if (!validation.valid) {
      setCommentError(validation.error || '')
      return
    }
    
    setCommentError('')
    setAddingComment(true)
    try {
      // Censor bad words before posting comment
      const cleanComment = censorBadWords(newComment.trim())
      
      const result = await addComment(selectedPost.id, cleanComment)
      setPostComments((prev) => [...prev, result.comment])
      setNewComment('')
      // Update comment count in posts list
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      )
    } catch (e) {
      alert('Failed to add comment')
    } finally {
      setAddingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost || !confirm('Delete this comment?')) return
    try {
      await deleteComment(commentId)
      setPostComments((prev) => prev.filter((c) => c.id !== commentId))
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
        )
      )
    } catch (e) {
      alert('Failed to delete comment')
    }
  }

  const canDeleteComment = (comment: CommunityComment) => {
    if (!user) return false
    return comment.author_id === user.id || user.role === 'admin'
  }

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero Header */}
      <PageTitleHero
        title="Community Forum"
        subtitle="Share tips, ask questions, and connect with fellow daing enthusiasts."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* Filter bar - aligned in one row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-3 py-2 border border-blue-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          />
        </div>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-blue-300 bg-white text-sm min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
        >
          <option value="All">All Categories</option>
          <option value="Tips">Tips</option>
          <option value="Questions">Questions</option>
          <option value="Showcase">Showcase</option>
          <option value="Discussion">Discussion</option>
        </select>

        {/* View toggle */}
        <div className="flex border border-blue-300 rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-blue-50'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('feed')}
            className={`p-2 border-l border-blue-300 transition-colors ${viewMode === 'feed' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-blue-50'}`}
            title="Feed view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors ml-auto rounded"
          >
            <Plus className="w-4 h-4" />
            Create post
          </button>
        )}
        {!isLoggedIn && (
          <div className="ml-auto text-sm text-slate-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            Login to create posts and join the discussion.{' '}
            <Link to="/login" className="text-blue-700 font-semibold hover:underline">Login</Link>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading posts...</div>
      ) : error ? (
        <div className="text-center py-16 text-red-600">{error}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MessageCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p>No posts yet. Be the first to create one!</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-blue-200 overflow-hidden group relative cursor-pointer shadow-md hover:shadow-lg hover:border-blue-400 transition-all duration-200 rounded-lg" onClick={() => openPostDetail(post)}>
              {/* Action buttons */}
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                {canEdit(post) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(post) }}
                    className="p-1.5 bg-white/90 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-blue-300 rounded transition-colors"
                    title="Edit post"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canDelete(post) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id) }}
                    className="p-1.5 bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-red-300 rounded transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="relative aspect-[4/3] overflow-hidden bg-blue-50">
                {post.images.length > 0 ? (
                  <img
                    src={post.images[0]}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-blue-300" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="flex items-center gap-4 text-white text-xs">
                    <button onClick={(e) => { e.stopPropagation(); handleLike(post.id) }} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                      <Heart className={`w-3.5 h-3.5 ${isLikedByUser(post) ? 'fill-red-500 text-red-500' : ''}`} /> {post.likes}
                    </button>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5" /> {post.shares}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-b from-white to-blue-50">
                <h3 className="font-bold text-slate-900 text-base line-clamp-2 mb-1">{post.title}</h3>
                <p className="text-sm text-slate-700 line-clamp-2 mb-3">{post.description}</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-xs font-medium text-blue-700">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs">
                    <div className="font-medium text-slate-800">{post.author_name}</div>
                    <div className="text-slate-400">{formatDate(post.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Netflix-style Feed View with Sidebars */
        <div className="space-y-8">
          {/* Horizontal Carousels Section */}
          {loadingCarousels ? (
            <div className="text-center py-8 text-slate-500">Loading featured posts...</div>
          ) : (
            <div className="space-y-6">
              {/* First Carousel: Filtered by selected category */}
              <PostCarousel
                title={feedCategory === 'All' ? 'Latest Posts' : feedCategory}
                icon={feedCategory === 'Tips' ? Lightbulb : feedCategory === 'Showcase' ? Sparkles : feedCategory === 'Questions' ? MessageCircle : Flame}
                posts={categoryPosts}
                onPostClick={openPostDetail}
                onLike={handleLike}
                isLikedByUser={isLikedByUser}
              />
              {/* Second Carousel: Most Liked Posts */}
              <PostCarousel
                title="Most Liked"
                icon={Heart}
                posts={mostLikedPosts}
                onPostClick={openPostDetail}
                onLike={handleLike}
                isLikedByUser={isLikedByUser}
              />
            </div>
          )}
          
          {/* Three-Column Layout: Left Sidebar | Main Feed | Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-6 items-start">
            
            {/* LEFT SIDEBAR - Filter Controls */}
            <div className="hidden lg:block sticky top-24">
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 p-4 shadow-lg hover:shadow-xl transition-shadow rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Filters</h3>
                </div>
                
                {/* Search */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      placeholder="Search..."
                      className="w-full pl-8 pr-3 py-2 border border-blue-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
                    />
                  </div>
                </div>
                
                {/* Category Filter */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
                  <div className="space-y-1">
                    {['All', 'Discussion', 'Questions', 'Tips', 'Showcase'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setFeedCategory(cat)
                          setCategory(cat)
                          setPage(1)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          feedCategory === cat 
                            ? 'bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Back to Top Button */}
                <button
                  onClick={scrollToTop}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors rounded"
                >
                  <ArrowUp className="w-4 h-4" />
                  Back to Top
                </button>
              </div>
            </div>

            {/* MAIN FEED - Center Column */}
            <div className="space-y-6">
              {/* Category Tabs (visible on mobile, hidden on lg) */}
              <div className="lg:hidden border-b border-blue-300">
                <div className="flex items-center gap-1 overflow-x-auto pb-px">
                  {['All', 'Discussion', 'Questions', 'Tips', 'Showcase'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setFeedCategory(cat)
                        setCategory(cat)
                        setPage(1)
                      }}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                        feedCategory === cat 
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posts */}
              {posts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>No posts in this category yet.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 shadow-md hover:border-blue-400 rounded-lg"
                    onClick={() => openPostDetail(post)}
                  >
                    {/* Author header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-medium text-slate-600">
                          {post.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{post.author_name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{formatDate(post.created_at)}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-medium uppercase">{post.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {canEdit(post) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(post) }}
                            className="p-2 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Edit post"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete(post) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(post.id) }}
                            className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Images with smooth hover */}
                    {post.images.length > 0 && (
                      <div className={`grid ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'} gap-1 overflow-hidden`}>
                        {post.images.slice(0, 3).map((img, idx) => (
                          <div 
                            key={idx} 
                            className={`${post.images.length === 3 && idx === 0 ? 'col-span-2' : ''} aspect-video overflow-hidden`}
                          >
                            <img 
                              src={img} 
                              alt="" 
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-xl text-slate-900 mb-2">{post.title}</h3>
                      <p className="text-slate-700 text-base mb-4 line-clamp-3">{post.description}</p>

                      {/* Likes indicator */}
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <div className="flex -space-x-1">
                          {[...Array(Math.min(3, post.likes))].map((_, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-blue-100 border border-white flex items-center justify-center">
                              <Heart className="w-2.5 h-2.5 text-blue-600 fill-blue-600" />
                            </div>
                          ))}
                        </div>
                        {post.likes > 0 && <span>Liked by {post.likes} {post.likes === 1 ? 'person' : 'others'}</span>}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between border-t border-black/10 pt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLike(post.id) }}
                          className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${isLikedByUser(post) ? 'text-blue-600' : 'text-slate-600'}`}
                        >
                          <Heart className={`w-4 h-4 transition-transform hover:scale-110 ${isLikedByUser(post) ? 'fill-blue-600' : ''}`} />
                          {post.likes}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openPostDetail(post) }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {post.comments_count} Comments
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* RIGHT SIDEBAR - Trending, Stats (Sticky) */}
            <div className="hidden lg:block sticky top-24">
              <div className="space-y-4">
              {/* Trending Section */}
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 p-4 shadow-lg hover:shadow-xl transition-shadow rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Trending</h3>
                </div>
                <div className="space-y-3">
                  {trendingPosts.slice(0, 5).map((post, idx) => (
                    <div 
                      key={post.id} 
                      onClick={() => openPostDetail(post)}
                      className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 transition-colors"
                    >
                      <span className="text-lg font-bold text-slate-300">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 line-clamp-2">{post.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{post.author_name}</p>
                      </div>
                    </div>
                  ))}
                  {trendingPosts.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">No trending posts</p>
                  )}
                </div>
              </div>

              {/* Community Stats */}
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 p-4 shadow-lg hover:shadow-xl transition-shadow rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Community Stats</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Total Members</span>
                    </div>
                    <span className="font-semibold text-slate-900">{communityStats.total_users.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Total Posts</span>
                    </div>
                    <span className="font-semibold text-slate-900">{communityStats.total_posts.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Total Comments</span>
                    </div>
                    <span className="font-semibold text-slate-900">{communityStats.total_comments.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Back to Top */}
              <button
                onClick={scrollToTop}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-md"
              >
                <ArrowUp className="w-4 h-4" />
                Back to Top
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {posts.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div>{Math.min(page * postsPerPage, total)}/{total} items</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={page}
              onChange={(e) => setPage(Math.max(1, Math.min(totalPages, Number(e.target.value) || 1)))}
              className="w-10 px-2 py-1 border border-black/20 text-center text-sm"
              min={1}
              max={totalPages}
            />
            <span>of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 border border-black/20 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 border border-black/20 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gradient-to-b from-white to-blue-50 w-full max-w-lg mx-4 border border-blue-200 shadow-2xl rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-lg font-semibold text-blue-900">Create Post</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-blue-100 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-1 rounded ${
                    createErrors.title ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="What's on your mind?"
                />
                {createErrors.title && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-1 rounded resize-none ${
                    createErrors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Share your thoughts, tips, or questions..."
                />
                {createErrors.description && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 bg-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
                >
                  <option value="Discussion">Discussion</option>
                  <option value="Tips">Tips</option>
                  <option value="Questions">Questions</option>
                  <option value="Showcase">Showcase</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Images (max 3)</label>
                <div className="flex flex-wrap gap-2">
                  {newImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 border border-blue-300 bg-blue-50 rounded overflow-hidden">
                      <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newImages.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 border border-dashed border-blue-300 bg-blue-50 flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors rounded"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-black/20">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-black/20 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={creating || !newTitle.trim() || !newDescription.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gradient-to-b from-white to-blue-50 w-full max-w-lg mx-4 border border-blue-200 shadow-2xl rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-lg font-semibold text-blue-900">Edit Post</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-blue-100 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-1 rounded ${
                    editErrors.title ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {editErrors.title && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-1 rounded resize-none ${
                    editErrors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {editErrors.description && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 bg-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
                >
                  <option value="Discussion">Discussion</option>
                  <option value="Tips">Tips</option>
                  <option value="Questions">Questions</option>
                  <option value="Showcase">Showcase</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-white">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-blue-300 bg-white text-sm hover:bg-blue-50 text-slate-900 transition-colors rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPost}
                disabled={isEditing || !editTitle.trim() || !editDescription.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
              >
                {isEditing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal with Comments */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closePostDetail}>
          <div className="bg-gradient-to-b from-white to-blue-50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-blue-200 shadow-2xl rounded-lg" onClick={(e) => e.stopPropagation()}>
            {/* Image carousel with dot navigation */}
            {selectedPost.images.length > 0 ? (
              <div className="md:w-1/2 bg-slate-900 relative flex items-center justify-center">
                <img
                  src={selectedPost.images[carouselIndex]}
                  alt=""
                  className="max-h-[50vh] md:max-h-full w-full object-contain"
                />
                {/* Dot navigation */}
                {selectedPost.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {selectedPost.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCarouselIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          idx === carouselIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="md:w-1/2 bg-slate-100 flex items-center justify-center min-h-[200px]">
                <ImageIcon className="w-16 h-16 text-slate-300" />
              </div>
            )}

            {/* Post content and comments */}
            <div className="md:w-1/2 flex flex-col max-h-[50vh] md:max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-black/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                    {selectedPost.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{selectedPost.author_name}</div>
                    <div className="text-xs text-slate-400">{formatDate(selectedPost.created_at)}</div>
                  </div>
                </div>
                <button onClick={closePostDetail} className="p-1 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 border-b border-black/20">
                <h3 className="font-bold text-xl text-slate-900 mb-2">{selectedPost.title}</h3>
                <p className="text-slate-700">{selectedPost.description}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <button 
                    onClick={() => handleLike(selectedPost.id)}
                    className={`flex items-center gap-1 ${isLikedByUser(selectedPost) ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`w-4 h-4 ${isLikedByUser(selectedPost) ? 'fill-red-500' : ''}`} />
                    {selectedPost.likes} likes
                  </button>
                  <span>{postComments.length} comments</span>
                </div>
              </div>

              {/* Comments section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingComments ? (
                  <div className="text-center text-slate-400 py-4">Loading comments...</div>
                ) : postComments.length === 0 ? (
                  <div className="text-center text-slate-400 py-4">No comments yet. Be the first!</div>
                ) : (
                  postComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                        {comment.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="bg-slate-100 px-3 py-2 rounded-lg">
                          <div className="font-medium text-sm text-slate-900">{comment.author_name}</div>
                          <p className="text-sm text-slate-700">{comment.text}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{formatDate(comment.created_at)}</span>
                          {canDeleteComment(comment) && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment */}
              {isLoggedIn ? (
                <div className="p-4 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className={`w-full px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-1 rounded ${
                          commentError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      {commentError && (
                        <p className="mt-1 text-xs text-red-600">{commentError}</p>
                      )}
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={addingComment}
                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded self-start"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-white text-sm text-slate-700">
                  Login to comment on this post.{' '}
                  <Link to="/login" className="text-blue-700 font-semibold hover:underline">Login</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
