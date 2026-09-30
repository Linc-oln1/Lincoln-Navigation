import type { Metadata } from "next"

/**
 * Title, description and the matching share-preview fields for a page.
 *
 * Next doesn't copy a page's `title`/`description` into its Open Graph or
 * X card tags, so without this a shared link would show the site-wide
 * text. A page's own `openGraph` also replaces the inherited one rather
 * than merging (dropping the inherited image), so the preview image is
 * always named here: the site-wide one by default, or the route's own
 * (`image`, e.g. "/features/opengraph-image.jpg") when it has one.
 */
const DEFAULT_IMAGE = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 630,
  alt: "Lincoln Navigation — maps and navigation built for Ghana",
}

export function pageMeta({
  title,
  description,
  path,
  image,
}: {
  title: string
  description: string
  path: string
  /** Path to this route's own preview image, if it has one. */
  image?: { url: string; alt: string }
}): Metadata {
  const img = image ? { ...DEFAULT_IMAGE, ...image } : DEFAULT_IMAGE
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Lincoln Navigation",
      type: "website",
      images: [img],
    },
    twitter: { card: "summary_large_image", title, description, images: [img.url] },
  }
}
