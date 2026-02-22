Logo images for the header (left side: TUP-T | DaingGrader | DaingGrader text).

Put your image files here:
  tup-t-logo.png       → TUP-T logo (e.g. university logo)
  dainggrader-logo.png → DaingGrader logo

Then in code (src/components/layout/Header.tsx), replace the placeholder divs with:
  <img src="/assets/logos/tup-t-logo.png" alt="TUP-T" className="h-10 w-auto" />
  <img src="/assets/logos/dainggrader-logo.png" alt="DaingGrader" className="h-10 w-auto" />
