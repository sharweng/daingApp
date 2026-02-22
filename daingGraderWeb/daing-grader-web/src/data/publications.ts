// Publications / references actually used in the DaingGrader paper
// (based on CHAPTER 2: Review of Related Literature and Studies).
// Classified into Local and Foreign for the Publications page.

export interface Publication {
  id: string
  title: string
  authors?: string
  publication: string // journal name, conference, or source
  year?: string
  volume?: string
  pages?: string
  reference: string // full citation text
  url: string // link to original source (from the PDF when available)
  type: 'local' | 'foreign'
}

export const publications: Publication[] = [
  // --- FOREIGN LITERATURE & STUDIES ---
  {
    id: 'for-agg-2024',
    type: 'foreign',
    title: 'Detection of mycotoxin contamination in foods using artificial intelligence: A review',
    authors: 'Aggarwal, A., Mishra, A., Tabassum, N., Kim, Y., & Khan, F.',
    publication: 'Foods',
    year: '2024',
    volume: '13(20)',
    pages: '3339',
    reference:
      'Aggarwal A., Mishra A., Tabassum N., Kim Y., & Khan F. (2024). Detection of mycotoxin contamination in foods using artificial intelligence: A review. Foods, 13(20), 3339.',
    url: 'https://www.mdpi.com/2304-8158/13/20/3339',
  },
  {
    id: 'for-nawaz-2022',
    type: 'foreign',
    title: 'A comprehensive review on color changes in dried fish products',
    authors: 'Nawaz, A., Xiong, Z., Irshad, S., Xiong, H., Li, Q., & Chen, L.',
    publication: 'Food Chemistry / related color analysis work (as cited in thesis)',
    year: '2022',
    reference:
      'Nawaz A., Xiong Z., Irshad S., Xiong H., Li Q., & Chen L. (2022). Work on CIELAB color parameters and color changes in dried fish, supporting quantitative color analysis for grading systems.',
    url: 'https://doi.org/ (see thesis reference [9])',
  },
  {
    id: 'for-liakos-2025',
    type: 'foreign',
    title: 'Machine Learning for Quality Control in the Food Industry: A Review',
    authors: 'Liakos, K. G., Athanasiadis, V., Bozinou, E., & Lalas, S. I.',
    publication: 'Foods',
    year: '2025',
    volume: '14(19)',
    pages: '3424',
    reference:
      'Liakos K. G., Athanasiadis V., Bozinou E., & Lalas S. I. (2025). Machine Learning for Quality Control in the Food Industry: A Review. Foods, 14(19), 3424.',
    url: 'https://doi.org/10.3390/foods14193424',
  },
  {
    id: 'for-xia-2024',
    type: 'foreign',
    title:
      'Early Detection of Surface Mildew in Maize Kernels Using Machine Vision Coupled with Improved YOLOv5 Deep Learning Model',
    authors: 'Xia, Y., Shen, A., Che, T., Liu, W., Kang, J., & Tang, W.',
    publication: 'Applied Sciences',
    year: '2024',
    volume: '14(22)',
    pages: '10489',
    reference:
      'Xia Y., Shen A., Che T., Liu W., Kang J., & Tang W. (2024). Early Detection of Surface Mildew in Maize Kernels Using Machine Vision Coupled with Improved YOLOv5 Deep Learning Model. Applied Sciences, 14(22), 10489.',
    url: 'https://www.mdpi.com/2076-3417/14/22/10489',
  },
  {
    id: 'for-kumari-2025',
    type: 'foreign',
    title: 'How AI is transforming food safety & quality in 2025',
    authors: 'Kumari, A.',
    publication: 'BCC Research (industry analysis)',
    year: '2025',
    reference:
      'Kumari A. (2025). How AI is transforming food safety & quality in 2025. BCC Research blog post cited as [5] in the thesis.',
    url: 'https://blog.bccresearch.com/how-ai-is-transforming-food-safety-quality-control-in-2025',
  },
  {
    id: 'for-bowman-2025',
    type: 'foreign',
    title: 'Top 5 ways AI is revolutionizing food safety inspections',
    authors: 'Bowman, C., & Sammer, H.',
    publication: 'Food Regulation Canada',
    year: '2025',
    reference:
      'Bowman C., & Sammer H. (2025). Top 5 ways AI is revolutionizing food safety inspections. Food Regulation Canada blog cited as [6].',
    url: 'https://www.foodregulationcanada.com/top-5-ways-ai-is-revolutionizing-food-safety-inspections-blog-post/',
  },
  {
    id: 'for-dhal-2025',
    type: 'foreign',
    title:
      'Leveraging artificial intelligence and advanced food processing techniques for enhanced food safety, quality, and security: A comprehensive review',
    authors: 'Dhal, S. B., & Kar, D.',
    publication: 'Discover Applied Sciences',
    year: '2025',
    volume: '7',
    pages: '75',
    reference:
      'Dhal S. B., & Kar D. (2025). Leveraging artificial intelligence and advanced food processing techniques for enhanced food safety, quality, and security: A comprehensive review. Discover Applied Sciences, 7, 75.',
    url: 'https://doi.org/10.1007/s42452-025-06472-w',
  },
  {
    id: 'for-jubayer-2021',
    type: 'foreign',
    title: 'YOLOv5-based mold detection on food surfaces',
    authors: 'Jubayer et al.',
    publication: 'Study on using YOLOv5 for mold detection (as cited in thesis, [11])',
    year: '2021',
    reference:
      'Jubayer et al. (2021). Experiments on locating mold on different surfaces of food using YOLOv5, demonstrating faster and more accurate detection than traditional CNNs.',
    url: 'https://doi.org/ (see thesis reference [11])',
  },

  // --- LOCAL LITERATURE & STUDIES ---
  {
    id: 'loc-daet-2025',
    type: 'local',
    title: 'Knowledge and Good Manufacturing Practices of Fish Drying Processor in Camarines Sur, Philippines',
    authors: 'Daet, I. P., Bigueja, M. C., & Sales, G. S.',
    publication: 'International Journal of Innovative Science and Research Technology',
    year: '2025',
    reference:
      'Daet I. P., Bigueja M. C., & Sales G. S. (2025). Knowledge and Good Manufacturing Practices of Fish Drying Processor in Camarines Sur, Philippines. International Journal of Innovative Science and Research Technology.',
    url: 'https://doi.org/10.38124/ijisrt/25nov1198',
  },
  {
    id: 'loc-rustia-2022',
    type: 'local',
    title:
      'Risk profiling of methylmercury in the consumption of dried Tamban (Sardinella lemuru) by the Filipino consuming population',
    authors:
      'Rustia, A. S., de Guzman, V. C. L., Salem, A. M. T., Bautista, K. A. D., Villarino, C. B. J., Ledda, W. E., Barrios, E. B., Capanzana, M. V., & Mahoney, D.',
    publication: 'Philippine Journal of Science',
    year: '2022',
    volume: '151(1)',
    pages: '449–463',
    reference:
      'Rustia A. S., de Guzman V. C. L., Salem A. M. T., Bautista K. A. D., Villarino C. B. J., et al. (2022). Risk profiling of methylmercury in the consumption of dried Tamban (Sardinella lemuru) by the Filipino consuming population. Philippine Journal of Science, 151(1), 449–463.',
    url: 'https://philjournalsci.dost.gov.ph/risk-profiling-of-methylmercury-in-the-consumption-of-dried-tamban-sardinella-lemuru-by-the-filipino-consuming-population/',
  },
  {
    id: 'loc-glenwood-2024',
    type: 'local',
    title: 'Food Safety Trends in the Philippines',
    authors: 'Glenwood Technologies',
    publication: 'Glenwood Technologies Asia',
    year: '2024',
    reference:
      'Glenwood Technologies (2024). Food Safety Trends in the Philippines. Article emphasizing monitoring environment and hygiene in wet markets.',
    url: 'https://www.glenwood.ph/ (see thesis reference [16])',
  },
  {
    id: 'loc-oceana-2023',
    type: 'local',
    title: 'Post-harvest fish loss and the National Sardines Management Plan',
    authors: 'Oceana Philippines',
    publication: 'Oceana Philippines report',
    year: '2023',
    reference:
      'Oceana Philippines (2023). Report on post-harvest fish loss and the National Sardines Management Plan, estimating spoilage rates of fish in the country at 25–40%.',
    url: 'https://ph.oceana.org/ (see thesis reference [18])',
  },
  {
    id: 'loc-ching-2024',
    type: 'local',
    title: 'Post-harvest fish handling practices of small-scale fisherfolk in Rosario, Cavite',
    authors: 'Ching et al.',
    publication: 'Study on dried fish safety in Rosario, Cavite',
    year: '2024',
    reference:
      'Ching et al. (2024). Study on post-harvest processing of Tuyo (dried Sardinella) in Rosario, Cavite, showing early mold growth due to inadequate hygienic standards.',
    url: 'https://doi.org/ (see thesis reference [20])',
  },
  {
    id: 'loc-magallanes-2024',
    type: 'local',
    title: 'Microbial quality of fish products and contact surfaces in Philippine wet markets',
    authors: 'Magallanes & Aguanza',
    publication: 'Local microbiological quality assessment study',
    year: '2024',
    reference:
      'Magallanes & Aguanza (2024). Assessment of microbial quality of fish products and contact surfaces in wet markets in the Philippines, highlighting high microbial counts and cross-contamination risks.',
    url: 'https://doi.org/ (see thesis reference [21])',
  },
]

export function getPublicationsByType(type: 'local' | 'foreign'): Publication[] {
  return publications.filter((p) => p.type === type)
}
