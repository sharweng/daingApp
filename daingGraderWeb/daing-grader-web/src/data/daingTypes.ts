// About Daing: 5 fish types. Each has a slug, display name, carousel images, and info sections.
// Carousel images: put files in public/assets/daing/<slug>/ e.g. public/assets/daing/espada/slide1.jpg
// Then set imageSrc: '/assets/daing/espada/slide1.jpg' (at least 3 per type).

export interface DaingSection {
  title: string
  content: string
}

export interface DaingType {
  slug: string
  name: string
  /** At least 3 image URLs or placeholder colors for carousel */
  carousel: Array<{ imageSrc?: string; placeholderColor: string; alt?: string }>
  sections: DaingSection[]
}

export const DAING_TYPES: DaingType[] = [
  {
    slug: 'espada',
    name: 'Espada',
    carousel: [
      { imageSrc: '/assets/daing/espada/slide1.jpg', placeholderColor: '#1e3a5f', alt: 'Espada dried fish' },
      { imageSrc: '/assets/daing/espada/slide2.jpg', placeholderColor: '#2a4a75', alt: 'Espada product' },
      { imageSrc: '/assets/daing/espada/slide3.jpg', placeholderColor: '#3b82f6', alt: 'Espada grading' },
    ],
    sections: [
      {
        title: 'About Espada',
        content: 'Espada, also known as beltfish or hairtail (Trichiurus species), is a commonly dried fish in the Philippines recognized for its long, flat body and silvery appearance. It is usually sun-dried to preserve freshness and extend shelf life. Espada is popular in local markets due to its affordability and strong flavor, making quality assessment important to ensure safety and market value.'
      },
      {
        title: 'Flavor Profile',
        content: 'Dried Espada is prized for its intense savory umami flavor and unique texture. When fried, the thin skin becomes exceptionally crispy while the meat inside remains slightly chewy. It has a moderate saltiness that pairs perfectly with the acidity of vinegar, balancing the rich, fishy profile.'
      },
      {
        title: 'Culinary Uses',
        content: 'The most popular way to prepare dried Espada is deep-frying until golden brown and crispy. It is a classic Filipino breakfast staple served with garlic fried rice (sinangag) and a dipping sauce of spiced vinegar (sukang paombong or pinakurat). In some regions, it is also added to vegetable stews like "bulanglang" to add a savory depth to the broth.'
      },
      {
        title: 'Quality Indicators',
        content: 'Good-quality dried espada has a light silver to pale brown color, firm flesh, and an even surface texture with minimal breakage. Discoloration, dark spots, and uneven drying patterns often indicate exposure to excess moisture or poor handling. The DaingGrader system evaluates color consistency, surface irregularities, and visible defects to classify espada into Export, Local, or Reject quality grades.'
      },
      {
        title: 'Safety and Handling',
        content: 'Espada is highly sensitive to moisture because of its thin body structure. Improper drying or storage may lead to rapid mold formation and surface spoilage. Early mold growth may not be easily visible, especially along folds and edges. DaingGrader assists in detecting subtle mold patterns and texture anomalies to reduce health risks and improve dried fish safety.'
      },
    ],
  },
  {
    slug: 'danggit',
    name: 'Danggit',
    carousel: [
      { imageSrc: '/assets/daing/danggit/slide1.jpg', placeholderColor: '#0f766e', alt: 'Danggit dried fish' },
      { imageSrc: '/assets/daing/danggit/slide2.jpg', placeholderColor: '#14b8a6', alt: 'Danggit product' },
      { imageSrc: '/assets/daing/danggit/slide3.jpg', placeholderColor: '#2dd4bf', alt: 'Danggit grading' },
    ],
    sections: [
      {
        title: 'About Danggit',
        content: 'Danggit, locally known as dried rabbitfish (Siganus species), is one of the most popular dried fish products in the Philippines. It is widely consumed as a breakfast staple, commonly paired with garlic rice and vinegar. Danggit is traditionally preserved through sun-drying, a method that reduces moisture to extend shelf life and enhance flavor. Due to its popularity and high market demand, maintaining consistent quality and safety is essential for both consumers and vendors.'
      },
      {
        title: 'Flavor Profile',
        content: 'Danggit is famous for its delicate, crunchy texture and a distinctively aromatic, salty-savory taste. Unsalted versions offer a milder, creamy seafood flavor, while the salted variety packs a punch. Its thin, butterfly cut allows it to become shatteringly crisp when fried, distinguishing it from meatier dried fish.'
      },
      {
        title: 'Culinary Uses',
        content: 'Best enjoyed as "Daing na Danggit" for breakfast, it is fried quickly (often just seconds) to avoid burning. It is the star of the famous "Danggit, Itlog, at Sinangag" (Dangsilog) combo. Smaller danggit can be eaten whole, including the bones, providing calcium. It is also a popular "pasalubong" (souvenir) item from Cebu and other coastal provinces.'
      },
      {
        title: 'Quality indicators',
        content: 'High-quality danggit is characterized by a uniform golden-brown color, intact fins and spines, firm texture, and the absence of visible mold or discoloration. Variations in color consistency and surface texture often indicate improper drying or early spoilage. In the DaingGrader system, these visual attributes are analyzed through automated image processing to assess surface uniformity, detect defects, and determine the appropriate quality grade.'
      },
      {
        title: 'Safety and handling',
        content: 'Improper drying, exposure to humidity, or poor storage conditions can lead to mold growth on danggit, posing potential health risks due to mycotoxin production. Early-stage mold contamination may not always be visible to the naked eye. The DaingGrader system enhances food safety by detecting subtle mold patterns and color changes at an early stage using AI-based computer vision.'
      },
    ],
  },
  {
    slug: 'dalagang-bukid',
    name: 'Dalagang Bukid',
    carousel: [
      { imageSrc: '/assets/daing/dalagang-bukid/slide1.jpg', placeholderColor: '#be185d', alt: 'Dalagang Bukid dried fish' },
      { imageSrc: '/assets/daing/dalagang-bukid/slide2.jpg', placeholderColor: '#db2777', alt: 'Dalagang Bukid product' },
      { imageSrc: '/assets/daing/dalagang-bukid/slide3.jpg', placeholderColor: '#ec4899', alt: 'Dalagang Bukid grading' },
    ],
    sections: [
      {
        title: 'About Dalagang Bukid',
        content: 'Dalagang Bukid, commonly known as yellowtail fusilier (Caesio species), is a popular dried fish variety in Philippine coastal communities. It is valued for its mild taste and firm meat. The fish is traditionally sun-dried, making proper drying conditions crucial to preserve quality and prevent spoilage.'
      },
      {
        title: 'Flavor Profile',
        content: 'Unlike the intense saltiness of other dried fish, Dalagang Bukid often retains a meatier, slightly sweet underlying flavor beneath the cure. The flesh is dense and firm, offering a satisfying chewiness rather than a brittle crunch. It absorbs marinades and sauces well, making it versatile.'
      },
      {
        title: 'Culinary Uses',
        content: 'While often fried, dried Dalagang Bukid is substantial enough to be cooked in sauces. A popular preparation is "Sarciado," where the fried fish is simmered in a thick tomato and egg sauce. It can also be grilled over charcoal for a smoky flavor that complements its natural taste.'
      },
      {
        title: 'Quality indicators',
        content: 'High-quality dried dalagang bukid exhibits a uniform light golden to yellowish-brown color, intact body structure, and smooth surface texture. Uneven coloration, surface cracks, or darkened areas may indicate improper drying or early quality degradation. The DaingGrader system analyzes these visual features to assess color uniformity, detect defects, and assign an appropriate quality grade.'
      },
      {
        title: 'Safety and handling',
        content: 'Due to its moderate fat content, dalagang bukid is prone to spoilage if not properly dried or stored. Exposure to humid environments can accelerate mold growth and surface deterioration. DaingGrader enhances safety by identifying early visual signs of mold and discoloration that may be overlooked during manual inspection.'
      },
    ],
  },
  {
    slug: 'flying-fish',
    name: 'Flying Fish',
    carousel: [
      { imageSrc: '/assets/daing/flying-fish/slide1.jpg', placeholderColor: '#4f46e5', alt: 'Flying fish dried' },
      { imageSrc: '/assets/daing/flying-fish/slide2.jpg', placeholderColor: '#6366f1', alt: 'Flying fish product' },
      { imageSrc: '/assets/daing/flying-fish/slide3.jpg', placeholderColor: '#818cf8', alt: 'Flying fish grading' },
    ],
    sections: [
      {
        title: 'About Flying Fish',
        content: 'Flying fish, locally known as Bangsi (Exocoetidae family), is commonly dried in coastal regions of the Philippines. It is recognized by its wing-like fins and is often processed through sun-drying to preserve its quality. Dried flying fish is valued for its unique texture and flavor.'
      },
      {
        title: 'Flavor Profile',
        content: 'Dried Flying Fish is known for its firm, lean meat that can be somewhat tough but flavorful. It has a distinct, earthy seafood taste that is less "fishy" than oily species. The wings (fins) become incredibly crispy when cooked, adding a unique texture component.'
      },
      {
        title: 'Culinary Uses',
        content: 'In provinces like Quezon and Bicol, dried Flying Fish is often grilled or fried. It is also a key ingredient in local soups where the dried fish is boiled to create a flavorful broth for vegetables. Its firm texture allows it to hold up well in boiling liquid without disintegrating.'
      },
      {
        title: 'Quality indicators',
        content: 'Good-quality dried flying fish has a consistent light brown to golden color, well-preserved fins, and a dry, firm surface. Broken fins, uneven drying marks, and color inconsistencies are indicators of handling or drying issues. The DaingGrader system evaluates surface texture and color distribution to ensure consistent grading.'
      },
      {
        title: 'Safety and handling',
        content: 'Flying fish has thin flesh, making it vulnerable to rapid moisture absorption and mold growth when exposed to humid conditions. Mold development often begins in fin joints and body creases. DaingGrader supports early detection of these risk areas, improving food safety and reducing post-harvest losses.'
      },
    ],
  },
  {
    slug: 'bisugo',
    name: 'Bisugo',
    carousel: [
      { imageSrc: '/assets/daing/bisugo/slide1.jpg', placeholderColor: '#b45309', alt: 'Bisugo dried fish' },
      { imageSrc: '/assets/daing/bisugo/slide2.jpg', placeholderColor: '#d97706', alt: 'Bisugo product' },
      { imageSrc: '/assets/daing/bisugo/slide3.jpg', placeholderColor: '#f59e0b', alt: 'Bisugo grading' },
    ],
    sections: [
      {
        title: 'About Bisugo',
        content: 'Bisugo, also known as threadfin bream (Nemipterus species), is a widely consumed dried fish in the Philippines. It is favored for its mild flavor and is commonly sold in dried form in local markets. Traditional sun-drying remains the primary preservation method.'
      },
      {
        title: 'Flavor Profile',
        content: 'Bisugo has a white, delicate flesh that offers a refined taste. Even when dried, it retains a hint of sweetness characteristic of bream species. It is generally less salty and pungent than other varieties, making it an excellent choice for those who find other dried fish too overpowering.'
      },
      {
        title: 'Culinary Uses',
        content: 'Dried Bisugo is versatile. While commonly fried until crispy, it is also frequently used as a base for stocks and broths. In some recipes, the fried fish is flaked and used as a topping for noodle dishes like Pancit or Arroz Caldo to add a savory crunch and protein boost.'
      },
      {
        title: 'Quality indicators',
        content: 'High-quality dried bisugo is identified by a pale golden to light brown color, intact scales, and a firm, evenly dried surface. Presence of dark spots, discoloration, or rough texture may indicate spoilage or improper drying. DaingGrader assesses these visual indicators to determine quality grade and detect surface defects.'
      },
      {
        title: 'Safety and handling',
        content: 'Bisugo is susceptible to mold growth when drying and storage conditions are poorly controlled. Early contamination may appear as subtle color changes or fine surface textures. The DaingGrader system enhances detection accuracy by identifying early-stage mold and quality degradation, supporting safer consumption and better quality control.'
      },
    ],
  },
]

export function getDaingTypeBySlug(slug: string): DaingType | undefined {
  return DAING_TYPES.find((t) => t.slug === slug)
}