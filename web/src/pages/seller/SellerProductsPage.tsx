import React, { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import PageTitleHero from '../../components/layout/PageTitleHero'
import {
  createCategory,
  createSellerProduct,
  deleteCategory,
  deleteSellerProduct,
  getCategories,
  getSellerProducts,
  importSellerProductsCsv,
  toggleSellerProductDisabled,
  updateCategory,
  updateSellerProduct,
  uploadSellerProductImages,
  deleteSellerProductImage,
  getSellerProductReviews,
  type ProductCategory,
  type ProductReview,
  type SellerProduct,
} from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { 
  validateProductName, 
  validateProductDescription, 
  validateCategoryName,
  validatePrice,
  censorBadWords,
} from '../../utils/validation'

const csvTemplate = `name,description,price,category,stock_qty,status,images,main_image_index\nDanggit Premium 500g,Premium dried fish,249.00,Danggit,24,available,https://example.com/image1.jpg|https://example.com/image2.jpg,0`

const emptyProductForm = {
  name: '',
  description: '',
  price: 0,
  category_id: '',
  stock_qty: 0,
  status: 'available',
  main_image_index: 0,
}

export default function SellerProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all')
  const [includeDisabled, setIncludeDisabled] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null)
  const [detailsProduct, setDetailsProduct] = useState<SellerProduct | null>(null)
  const [inventoryForm, setInventoryForm] = useState({ stock_qty: 0, status: 'available' })
  const [productsOpen, setProductsOpen] = useState(true)
  const [categoriesOpen, setCategoriesOpen] = useState(true)
  const [myCategoriesOpen, setMyCategoriesOpen] = useState(true)
  const [otherCategoriesOpen, setOtherCategoriesOpen] = useState(false)
  const [detailModalProduct, setDetailModalProduct] = useState<SellerProduct | null>(null)
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewTotal, setReviewTotal] = useState(0)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const reviewPageSize = 3

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productModalMode, setProductModalMode] = useState<'create' | 'edit'>('create')
  const [activeProduct, setActiveProduct] = useState<SellerProduct | null>(null)
  const [productForm, setProductForm] = useState({ ...emptyProductForm })
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', id: '' })
  const [categoryFormErrors, setCategoryFormErrors] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; errors: { row: number; error: string }[] } | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        getSellerProducts({
          search,
          category_id: categoryFilter || undefined,
          in_stock: stockFilter === 'all' ? undefined : stockFilter === 'in',
          include_disabled: includeDisabled,
          page,
          page_size: pageSize,
        }),
        getCategories(),
      ])
      setProducts(productsRes.products || [])
      setTotal(productsRes.total || 0)
      setCategories(categoriesRes.categories || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1)
    }, 350)
    return () => clearTimeout(handle)
  }, [search, categoryFilter, stockFilter, includeDisabled])

  useEffect(() => {
    loadData()
  }, [page, search, categoryFilter, stockFilter, includeDisabled])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => products.some((p) => p.id === id)))
    if (activeDetailsId && !products.some((p) => p.id === activeDetailsId)) {
      setActiveDetailsId(null)
      setDetailsProduct(null)
    }
  }, [products, activeDetailsId])

  const kpis = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => !p.is_disabled).length
    const outOfStock = products.filter((p) => p.stock_qty <= 0).length
    const inventoryUnits = products.reduce((sum, p) => sum + (p.stock_qty || 0), 0)
    const inventoryValue = products.reduce((sum, p) => sum + (p.stock_qty || 0) * (p.price || 0), 0)
    return [
      { label: 'Total Products', value: total.toString() },
      { label: 'Active Products', value: active.toString() },
      { label: 'Out of Stock', value: outOfStock.toString() },
      { label: 'Inventory Units', value: inventoryUnits.toString() },
      { label: 'Inventory Value', value: formatMoney(inventoryValue) },
    ]
  }, [products])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const productCountsByCategory = useMemo(() => {
    const map = new Map<string, number>()
    products.forEach((p) => {
      const key = p.category_id || 'uncategorized'
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [products])

  const { myCategories, otherCategories } = useMemo(() => {
    const owned = categories.filter((cat) => cat.created_by === user?.id)
    const notOwned = categories.filter((cat) => cat.created_by !== user?.id)
    return { myCategories: owned, otherCategories: notOwned }
  }, [categories, user?.id])

  const visibleIds = useMemo(() => products.map((p) => p.id), [products])
  const allSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id)),
    [visibleIds, selectedIds]
  )

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const openInventoryPanel = (product: SellerProduct) => {
    if (activeDetailsId === product.id) {
      setActiveDetailsId(null)
      setDetailsProduct(null)
      return
    }
    setActiveDetailsId(product.id)
    setDetailsProduct(product)
    setInventoryForm({ stock_qty: product.stock_qty, status: product.status || 'available' })
    setReviewPage(1)
  }

  const loadReviews = async (productId: string, pageNumber: number) => {
    setReviewsLoading(true)
    try {
      const res = await getSellerProductReviews(productId, pageNumber, reviewPageSize)
      setReviews(res.reviews || [])
      setReviewTotal(res.total || 0)
    } finally {
      setReviewsLoading(false)
    }
  }

  const openProductModal = (mode: 'create' | 'edit', product?: SellerProduct) => {
    setProductModalMode(mode)
    setActiveProduct(product || null)
    setProductForm(
      product
        ? {
            name: product.name,
            description: product.description || '',
            price: product.price,
            category_id: product.category_id || '',
            stock_qty: product.stock_qty,
            status: product.status || 'available',
            main_image_index: product.main_image_index || 0,
          }
        : { ...emptyProductForm }
    )
      setPendingImages([])
    setProductFormErrors({})
    setProductModalOpen(true)
  }

  const validateProductForm = () => {
    const errors: Record<string, string> = {}
    
    // Validate product name
    const nameValidation = validateProductName(productForm.name)
    if (!nameValidation.valid) {
      errors.name = nameValidation.error!
    }
    
    // Validate description
    const descValidation = validateProductDescription(productForm.description)
    if (!descValidation.valid) {
      errors.description = descValidation.error!
    }
    
    // Validate price
    const priceValidation = validatePrice(productForm.price)
    if (!priceValidation.valid) {
      errors.price = priceValidation.error!
    }
    
    // Validate stock quantity
    if (Number.isNaN(Number(productForm.stock_qty)) || Number(productForm.stock_qty) < 0) {
      errors.stock_qty = 'Stock cannot be negative.'
    }
    
    // Validate status
    if (!['available', 'draft'].includes(productForm.status)) {
      errors.status = 'Invalid status.'
    }
    
    setProductFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateCategoryForm = () => {
    const errors: Record<string, string> = {}
    
    // Validate category name
    const nameValidation = validateCategoryName(categoryForm.name)
    if (!nameValidation.valid) {
      errors.name = nameValidation.error!
    }
    
    // Validate description (optional)
    const descValidation = validateProductDescription(categoryForm.description)
    if (!descValidation.valid) {
      errors.description = descValidation.error!
    }
    
    setCategoryFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveProduct = async () => {
    if (!validateProductForm()) {
      setError('Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Censor bad words in name and description
      const cleanName = censorBadWords(productForm.name.trim())
      const cleanDescription = censorBadWords(productForm.description.trim())
      
      let updated: SellerProduct
      if (productModalMode === 'create') {
        const res = await createSellerProduct({
          name: cleanName,
          description: cleanDescription,
          price: Number(productForm.price),
          category_id: productForm.category_id || undefined,
          stock_qty: Number(productForm.stock_qty),
          status: productForm.status,
        })
        updated = res.product
      } else if (activeProduct) {
        const res = await updateSellerProduct(activeProduct.id, {
          name: cleanName,
          description: cleanDescription,
          price: Number(productForm.price),
          category_id: productForm.category_id || null,
          stock_qty: Number(productForm.stock_qty),
          status: productForm.status,
          main_image_index: productForm.main_image_index,
        })
        updated = res.product
      } else {
        return
      }

      if (pendingImages.length > 0) {
        await uploadSellerProductImages(updated.id, pendingImages, productForm.main_image_index)
      }
      setProductModalOpen(false)
      setPendingImages([])
      setProductFormErrors({})
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleSoftDelete = async (product: SellerProduct) => {
    await toggleSellerProductDisabled(product.id, !product.is_disabled)
    await loadData()
  }

  const handleHardDelete = async (product: SellerProduct) => {
    if (!confirm(`Permanently delete ${product.name}? This cannot be undone.`)) return
    await deleteSellerProduct(product.id)
    await loadData()
  }

  const saveInventory = async () => {
    if (!detailsProduct) return
    setSaving(true)
    try {
      await updateSellerProduct(detailsProduct.id, {
        stock_qty: Number(inventoryForm.stock_qty),
        status: inventoryForm.status,
      })
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const totalReviewPages = Math.max(1, Math.ceil(reviewTotal / reviewPageSize))

  useEffect(() => {
    if (detailsProduct) {
      loadReviews(detailsProduct.id, reviewPage)
    }
  }, [detailsProduct, reviewPage])

  const handleAddImages = (files: FileList | null) => {
    if (!files) return
    setPendingImages((prev) => [...prev, ...Array.from(files)])
  }

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = async (productId: string, index: number) => {
    await deleteSellerProductImage(productId, index)
    await loadData()
    const refreshed = products.find((p) => p.id === productId)
    if (refreshed) setActiveProduct(refreshed)
  }

  const handleBulkDisable = async (disabled: boolean) => {
    await Promise.all(selectedIds.map((id) => toggleSellerProductDisabled(id, disabled)))
    setSelectedIds([])
    await loadData()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} products permanently? This cannot be undone.`)) return
    await Promise.all(selectedIds.map((id) => deleteSellerProduct(id)))
    setSelectedIds([])
    await loadData()
  }

  const handleBulkCategory = async () => {
    if (!bulkCategoryId) return
    await Promise.all(selectedIds.map((id) => updateSellerProduct(id, { category_id: bulkCategoryId })))
    setSelectedIds([])
    setBulkCategoryId('')
    await loadData()
  }

  const saveCategory = async () => {
    if (!validateCategoryForm()) {
      setError('Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    try {
      // Censor bad words in name and description
      const cleanName = censorBadWords(categoryForm.name.trim())
      const cleanDescription = censorBadWords(categoryForm.description.trim())
      
      if (categoryForm.id) {
        await updateCategory(categoryForm.id, { name: cleanName, description: cleanDescription })
      } else {
        await createCategory({ name: cleanName, description: cleanDescription })
      }
      setCategoryModalOpen(false)
      setCategoryForm({ name: '', description: '', id: '' })
      setCategoryFormErrors({})
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleImportCsv = async (file: File) => {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await importSellerProductsCsv(file)
      setImportResult({ inserted: res.inserted, errors: res.errors || [] })
      await loadData()
    } catch (err: any) {
      setImportResult({ inserted: 0, errors: [{ row: 0, error: err.message || 'Import failed' }] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageTitleHero
        title="Product Management"
        subtitle="Manage your inventory and product listings"
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      <div className="space-y-6 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Product Catalog</h1>
            <p className="text-sm text-slate-600 mt-1">Manage products, inventory, categories, and imports.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            onClick={() => openProductModal('create')}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl p-4 shadow-md">
            <div className="text-xs text-slate-500 font-semibold uppercase">{kpi.label}</div>
            <div className="text-2xl font-bold text-blue-900 mt-2">{kpi.value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Products</h2>
            <p className="text-xs text-slate-500">Manage products with bulk selection and visibility toggles.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 text-sm text-blue-700"
            onClick={() => setProductsOpen((prev) => !prev)}
          >
            {productsOpen ? 'Collapse' : 'Expand'}
            {productsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {productsOpen && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-blue-200 rounded-lg"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as 'all' | 'in' | 'out')}
                className="px-3 py-2 text-sm border border-blue-200 rounded-lg"
              >
                <option value="all">All Stock</option>
                <option value="in">In Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              <ToggleSwitch
                label="Show disabled"
                checked={includeDisabled}
                onChange={() => setIncludeDisabled((prev) => !prev)}
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                <span className="font-semibold text-blue-900">Bulk actions:</span>
                <button
                  className="px-2 py-1 border border-blue-200 rounded"
                  onClick={() => handleBulkDisable(true)}
                >
                  Disable
                </button>
                <button
                  className="px-2 py-1 border border-blue-200 rounded"
                  onClick={() => handleBulkDisable(false)}
                >
                  Enable
                </button>
                <button
                  className="px-2 py-1 border border-red-200 text-red-600 rounded"
                  onClick={handleBulkDelete}
                >
                  Delete
                </button>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="px-2 py-1 border border-blue-200 rounded"
                >
                  <option value="">Set category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  className="px-2 py-1 border border-blue-200 rounded"
                  onClick={handleBulkCategory}
                >
                  Apply
                </button>
              </div>
            )}

            <div className="overflow-x-auto border border-blue-200 rounded-xl shadow-md bg-white">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-left px-3 py-2">Price</th>
                    <th className="text-left px-3 py-2">Stock</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-left px-3 py-2">Visible</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Loading products...</td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>No products found.</td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="border-t border-blue-100">
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelectOne(product.id)} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <ImageCarousel images={product.images} mainIndex={product.main_image_index} />
                            <div>
                              <div className="font-semibold text-slate-800">{product.name}</div>
                              <div className="text-xs text-slate-500 line-clamp-1">{product.description || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(product.price)}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${product.stock_qty <= 0 ? 'bg-red-100 text-red-700' : product.stock_qty <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {product.stock_qty} pcs
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{product.category_name || 'Uncategorized'}</td>
                        <td className="px-3 py-3">
                          <ToggleSwitch checked={!product.is_disabled} onChange={() => handleSoftDelete(product)} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              className="px-2 py-1 text-xs border border-blue-200 rounded"
                              onClick={() => setDetailModalProduct(product)}
                            >
                              View Details
                            </button>
                            <button
                              className="px-2 py-1 text-xs border border-blue-200 rounded"
                              onClick={() => openInventoryPanel(product)}
                            >
                              Inventory & Reviews
                            </button>
                            <button
                              className="px-2 py-1 text-xs border border-blue-200 rounded"
                              onClick={() => openProductModal('edit', product)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded"
                              onClick={() => handleHardDelete(product)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 border border-blue-200 rounded-lg disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1 border border-blue-200 rounded-lg disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>

            {detailsProduct && activeDetailsId === detailsProduct.id && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl shadow-md p-4">
                  <div className="text-sm font-semibold text-blue-900 mb-3">Inventory</div>
                  <div className="space-y-3">
                    <Field label="Stock Quantity">
                      <input
                        type="number"
                        min="0"
                        value={inventoryForm.stock_qty}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, stock_qty: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg"
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        value={inventoryForm.status}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, status: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg"
                      >
                        <option value="available">Available</option>
                        <option value="draft">Draft</option>
                      </select>
                    </Field>
                    <button
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                      onClick={saveInventory}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Inventory'}
                    </button>
                  </div>
                </div>
                <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl shadow-md p-4">
                  <div className="text-sm font-semibold text-blue-900 mb-3">Reviews & Ratings</div>
                  {reviewsLoading ? (
                    <div className="text-sm text-slate-500">Loading reviews...</div>
                  ) : reviews.length === 0 ? (
                    <div className="text-sm text-slate-500">No reviews yet.</div>
                  ) : (
                    <div className="space-y-3 text-sm text-slate-600">
                      {reviews.map((review) => (
                        <button
                          key={review.id}
                          className="text-left w-full border border-blue-100 rounded-lg p-3 bg-white"
                          onClick={() => setDetailModalProduct(detailsProduct)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-slate-700">{review.user_name || 'Anonymous'}</div>
                            <div className="text-xs text-amber-600 font-semibold">{review.rating} ★</div>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{review.created_at || '—'}</div>
                          <div className="text-sm text-slate-700 mt-1">{review.comment}</div>
                        </button>
                      ))}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Page {reviewPage} of {totalReviewPages}</span>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 border border-blue-200 rounded"
                            onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                            disabled={reviewPage <= 1}
                          >
                            Prev
                          </button>
                          <button
                            className="px-2 py-1 border border-blue-200 rounded"
                            onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))}
                            disabled={reviewPage >= totalReviewPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>


      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Categories</h2>
            <p className="text-xs text-slate-500">Manage global product categories.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 text-sm text-blue-700"
              onClick={() => setCategoriesOpen((prev) => !prev)}
            >
              {categoriesOpen ? 'Collapse All' : 'Expand All'}
              {categoriesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm"
              onClick={() => {
                setCategoryForm({ name: '', description: '', id: '' })
                setCategoryModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>

        {categoriesOpen && (
          <div className="space-y-4">
            {/* My Categories Section */}
            <div className="border border-blue-200 rounded-xl shadow-md bg-white overflow-hidden">
              <button
                onClick={() => setMyCategoriesOpen((prev) => !prev)}
                className="w-full px-4 py-3 bg-blue-50 flex items-center justify-between border-b border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-blue-900 text-sm font-semibold">📌 My Categories</span>
                  <span className="text-slate-500 text-sm">({myCategories.length})</span>
                </div>
                {myCategoriesOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {myCategoriesOpen && (
                <div className="overflow-x-auto">
                  {myCategories.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                      You haven't created any categories yet
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50 text-slate-600">
                        <tr>
                          <th className="text-left px-3 py-2">Category</th>
                          <th className="text-left px-3 py-2">Products</th>
                          <th className="text-right px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myCategories.map((cat) => (
                          <tr key={cat.id} className="border-t border-blue-100">
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-800">{cat.name}</div>
                              <div className="text-xs text-slate-500">{cat.description || '—'}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {productCountsByCategory.get(cat.id) || 0}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                className="px-2 py-1 text-xs border border-blue-200 rounded mr-2"
                                onClick={() => {
                                  setCategoryForm({ name: cat.name, description: cat.description || '', id: cat.id })
                                  setCategoryModalOpen(true)
                                }}
                                title="Edit category"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded"
                                onClick={() => {
                                  if (window.confirm('Delete this category?')) {
                                    deleteCategory(cat.id).then(loadData)
                                  }
                                }}
                                title="Delete category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Other Categories Section */}
            {otherCategories.length > 0 && (
              <div className="border border-blue-200 rounded-xl shadow-md bg-white overflow-hidden">
                <button
                  onClick={() => setOtherCategoriesOpen((prev) => !prev)}
                  className="w-full px-4 py-3 bg-blue-50 flex items-center justify-between border-b border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-blue-900 text-sm font-semibold">🏪 Other Sellers' Categories</span>
                    <span className="text-slate-500 text-sm">({otherCategories.length})</span>
                  </div>
                  {otherCategoriesOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {otherCategoriesOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50 text-slate-600">
                        <tr>
                          <th className="text-left px-3 py-2">Category</th>
                          <th className="text-left px-3 py-2">Products</th>
                          <th className="text-right px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherCategories.map((cat) => (
                          <tr key={cat.id} className="border-t border-blue-100">
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-800">{cat.name}</div>
                              <div className="text-xs text-slate-500">
                                {cat.description || '—'}
                                <span className="ml-2 text-amber-600 font-medium">(Read-only)</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {productCountsByCategory.get(cat.id) || 0}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                className="px-2 py-1 text-xs border border-slate-200 text-slate-400 cursor-not-allowed opacity-50 rounded mr-2"
                                disabled
                                title="Only the creator can edit this category"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                className="px-2 py-1 text-xs border border-slate-200 text-slate-400 cursor-not-allowed opacity-50 rounded"
                                disabled
                                title="Only the creator can delete this category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-blue-900">Import Products (CSV)</h2>
          <p className="text-xs text-slate-500">Use the template to format CSV files. Required columns must be present.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files && handleImportCsv(e.target.files[0])}
            />
          </label>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
            download="products-template.csv"
            className="text-sm text-blue-600"
          >
            Download template
          </a>
        </div>

        <div className="overflow-x-auto border border-blue-200 rounded-xl shadow-md bg-white">
          <table className="w-full text-xs">
            <thead className="bg-blue-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Column</th>
                <th className="text-left px-3 py-2">Required</th>
                <th className="text-left px-3 py-2">Example</th>
              </tr>
            </thead>
            <tbody>
              <CsvRow name="name" required example="Danggit Premium 500g" />
              <CsvRow name="price" required example="249.00" />
              <CsvRow name="stock_qty" required example="24" />
              <CsvRow name="category" required example="Danggit" />
              <CsvRow name="description" example="Premium dried fish" />
              <CsvRow name="status" example="available" />
              <CsvRow name="images" example="url1|url2" />
              <CsvRow name="main_image_index" example="0" />
            </tbody>
          </table>
        </div>

        {importResult && (
          <div className="text-sm text-slate-700">
            <div className="font-semibold">Inserted: {importResult.inserted}</div>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600">
                {importResult.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {productModalOpen && (
        <Modal title={productModalMode === 'create' ? 'Add Product' : 'Edit Product'} onClose={() => setProductModalOpen(false)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-3">
              <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">Image Preview</div>
                <div className="w-full aspect-square rounded-lg border border-dashed border-blue-200 flex items-center justify-center text-xs text-slate-400">
                  {pendingImages.length ? 'Preview below' : 'Upload images'}
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">Upload Images</div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 text-xs border border-blue-200 rounded-lg text-blue-700 cursor-pointer">
                    Choose files
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddImages(e.target.files)}
                    />
                  </label>
                  <label className="px-3 py-2 text-xs border border-blue-200 rounded-lg text-blue-700 cursor-pointer">
                    Add more images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddImages(e.target.files)}
                    />
                  </label>
                </div>
                {pendingImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {pendingImages.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="relative rounded-lg overflow-hidden border border-blue-100">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-20 object-cover" />
                        <button
                          className="absolute top-1 right-1 bg-white/90 rounded-full p-1"
                          onClick={() => removePendingImage(index)}
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {activeProduct && activeProduct.images.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Main Image</div>
                    <ImageCarousel
                      images={activeProduct.images}
                      mainIndex={productForm.main_image_index}
                      onChangeMain={(index) => setProductForm({ ...productForm, main_image_index: index })}
                    />
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {activeProduct.images.map((img, idx) => (
                        <div key={img.url} className="relative rounded-lg overflow-hidden border border-blue-100">
                          <img src={img.url} alt="Product" className="w-full h-20 object-cover" />
                          <button
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-1"
                            onClick={() => removeExistingImage(activeProduct.id, idx)}
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Name">
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      productFormErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                    }`}
                    placeholder="e.g., Premium Danggit 500g"
                  />
                  {productFormErrors.name && (
                    <div className="text-xs text-red-500 mt-1">{productFormErrors.name}</div>
                  )}
                </Field>
                <Field label="Category">
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className={`w-full px-3 py-2 text-sm border rounded-lg ${
                    productFormErrors.description ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                  }`}
                  rows={4}
                  placeholder="Describe your product..."
                />
                {productFormErrors.description && (
                  <div className="text-xs text-red-500 mt-1">{productFormErrors.description}</div>
                )}
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      productFormErrors.price ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                    }`}
                    placeholder="0.00"
                  />
                  {productFormErrors.price && (
                    <div className="text-xs text-red-500 mt-1">{productFormErrors.price}</div>
                  )}
                </Field>
                <Field label="Stock">
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock_qty}
                    onChange={(e) => setProductForm({ ...productForm, stock_qty: Number(e.target.value) })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      productFormErrors.stock_qty ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                    }`}
                    placeholder="0"
                  />
                  {productFormErrors.stock_qty && (
                    <div className="text-xs text-red-500 mt-1">{productFormErrors.stock_qty}</div>
                  )}
                </Field>
                <Field label="Status">
                  <select
                    value={productForm.status}
                    onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      productFormErrors.status ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                    }`}
                  >
                    <option value="available">Available</option>
                    <option value="draft">Draft</option>
                  </select>
                  {productFormErrors.status && (
                    <div className="text-xs text-red-500 mt-1">{productFormErrors.status}</div>
                  )}
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-2 text-sm border border-slate-200 rounded-lg" onClick={() => setProductModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                  onClick={saveProduct}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {detailModalProduct && (
        <Modal title="Product Details" onClose={() => setDetailModalProduct(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">Images</div>
                {detailModalProduct.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {detailModalProduct.images.map((img, idx) => (
                      <div key={img.url} className={`rounded-lg overflow-hidden border ${idx === detailModalProduct.main_image_index ? 'border-blue-500' : 'border-blue-200'}`}>
                        <img src={img.url} alt="Product" className="w-full h-40 object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No images uploaded.</div>
                )}
              </div>
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">Details</div>
                <div className="text-sm text-slate-700 space-y-2">
                  <div><span className="font-semibold">Name:</span> {detailModalProduct.name}</div>
                  <div><span className="font-semibold">Category:</span> {detailModalProduct.category_name || 'Uncategorized'}</div>
                  <div><span className="font-semibold">Price:</span> {formatMoney(detailModalProduct.price)}</div>
                  <div><span className="font-semibold">Stock:</span> {detailModalProduct.stock_qty}</div>
                  <div><span className="font-semibold">Status:</span> {detailModalProduct.status}</div>
                  <div><span className="font-semibold">Visibility:</span> {detailModalProduct.is_disabled ? 'Disabled' : 'Visible'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">Inventory</div>
                <div className="text-sm text-slate-600">Stock quantity: {detailModalProduct.stock_qty}</div>
              </div>
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">Reviews & Ratings</div>
                <div className="text-sm text-slate-600">Reviews will appear here when connected.</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {categoryModalOpen && (
        <Modal title={categoryForm.id ? 'Edit Category' : 'Add Category'} onClose={() => setCategoryModalOpen(false)}>
          <div className="space-y-3">
            <Field label="Name">
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  categoryFormErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                }`}
                placeholder="e.g., Danggit, Boneless Bangus"
              />
              {categoryFormErrors.name && (
                <div className="text-xs text-red-500 mt-1">{categoryFormErrors.name}</div>
              )}
            </Field>
            <Field label="Description">
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  categoryFormErrors.description ? 'border-red-300 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'
                }`}
                rows={3}
                placeholder="Describe this category..."
              />
              {categoryFormErrors.description && (
                <div className="text-xs text-red-500 mt-1">{categoryFormErrors.description}</div>
              )}
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-2 text-sm border border-slate-200 rounded-lg" onClick={() => setCategoryModalOpen(false)}>
                Cancel
              </button>
              <button
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                onClick={saveCategory}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </>
  )
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" className="inline-flex items-center gap-2" onClick={onChange}>
      <span
        className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'} relative`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
      {label && <span className="text-xs text-slate-600">{label}</span>}
    </button>
  )
}

function CsvRow({ name, required, example }: { name: string; required?: boolean; example: string }) {
  return (
    <tr className="border-t border-blue-100">
      <td className="px-3 py-2 text-slate-700 font-semibold">{name}</td>
      <td className="px-3 py-2">
        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${required ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          {required ? 'Required' : 'Optional'}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-500">{example}</td>
    </tr>
  )
}

function ImageCarousel({
  images,
  mainIndex,
  onChangeMain,
}: {
  images: { url: string }[]
  mainIndex: number
  onChangeMain?: (index: number) => void
}) {
  const [index, setIndex] = useState(mainIndex || 0)
  const total = images.length
  const safeIndex = total === 0 ? 0 : Math.max(0, Math.min(index, total - 1))

  useEffect(() => {
    setIndex(mainIndex || 0)
  }, [mainIndex])

  if (total === 0) {
    return <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center text-xs text-blue-600">No image</div>
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="w-6 h-6 rounded-full border border-blue-200 flex items-center justify-center"
        onClick={() => setIndex((prev) => (prev - 1 + total) % total)}
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <div className="w-14 h-14 rounded-lg border border-blue-200 overflow-hidden bg-white">
        <img src={images[safeIndex].url} alt="Product" className="w-full h-full object-cover" />
      </div>
      <button
        type="button"
        className="w-6 h-6 rounded-full border border-blue-200 flex items-center justify-center"
        onClick={() => setIndex((prev) => (prev + 1) % total)}
      >
        <ChevronRight className="w-3 h-3" />
      </button>
      {onChangeMain && (
        <button
          type="button"
          className="px-2 py-1 text-xs border border-blue-200 rounded-lg"
          onClick={() => onChangeMain(safeIndex)}
        >
          Set main
        </button>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-blue-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
          <div className="font-semibold text-blue-900 text-lg">{title}</div>
          <button className="p-1 text-slate-500" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
