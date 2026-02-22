// Shared dataset image data - used by DatasetPage and DatasetImageDetailPage.
// Replace with API call when backend is ready.

export interface DatasetImage {
  id: string
  filename: string
  url?: string
  hasAnnotations: boolean
  annotations?: Array<{ x: number; y: number; width: number; height: number }>
  /** Optional: for detail page */
  category?: string
  dimensions?: { width: number; height: number }
  dateAdded?: string
  description?: string
}

// NOTE: Put dataset images in public/assets/dataset/img-1.jpg ... img-50.jpg
// Display uses object-cover; any size will scale. Suggested: 600×600 or square.
export const datasetImages: DatasetImage[] = Array.from({ length: 50 }, (_, i) => ({
  id: `img-${i + 1}`,
  filename: `PXL_20260125_163309686_${String(i + 1).padStart(3, '0')}.jpg`,
  url: `/assets/dataset/img-${i + 1}.jpg`,
  hasAnnotations: i % 3 !== 0,
  annotations: i % 3 !== 0
    ? [
        { x: 10, y: 10, width: 30, height: 40 },
        ...(i % 5 === 0 ? [{ x: 50, y: 20, width: 25, height: 35 }] : []),
      ]
    : undefined,
  category: ['Danggit', 'Tuyo', 'Daing', 'Bagoong', 'Other'][i % 5],
  dimensions: { width: 600, height: 400 },
  dateAdded: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  description: `Sample image ${i + 1} from the DaingGrader dataset for fish grading classification.`,
}))

export function getImageById(id: string): DatasetImage | undefined {
  return datasetImages.find((img) => img.id === id)
}
