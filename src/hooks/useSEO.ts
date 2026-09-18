import { useEffect } from "react";

const BASE_URL = "https://vi-play.pages.dev";
const DEFAULT_TITLE = "Vi-Play — Stream Movies, TV Shows & Anime in HD";
const DEFAULT_DESC =
  "Vi-Play is a modern edge-powered media streaming platform for Movies, TV Shows, and Anime. Stream in high definition with adaptive bitrate and multi-language subtitles.";
const DEFAULT_IMAGE = `${BASE_URL}/icons/android-icon-192x192.png`;

export interface SEOOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "video.movie" | "video.tv_show";
  schema?: Record<string, unknown> | null;
}

export function useSEO({
  title,
  description,
  canonicalPath = "/",
  ogImage,
  ogType = "website",
  schema,
}: SEOOptions): void {
  useEffect(() => {
    // 1. Meta Title
    const fullTitle = title ? `${title} — Vi-Play` : DEFAULT_TITLE;
    document.title = fullTitle;

    // 2. Meta Description
    const desc = description || DEFAULT_DESC;
    const descMeta = document.getElementById(
      "meta-description",
    ) as HTMLMetaElement | null;
    if (descMeta) {
      descMeta.content = desc;
    }

    // 3. Canonical Tag
    const cleanPath = canonicalPath.startsWith("/")
      ? canonicalPath
      : `/${canonicalPath}`;
    const canonicalUrl = `${BASE_URL}${cleanPath === "/" ? "" : cleanPath}`;
    const canonicalLink = document.getElementById(
      "canonical-url",
    ) as HTMLLinkElement | null;
    if (canonicalLink) {
      canonicalLink.href = canonicalUrl;
    }

    // 4. OpenGraph & Twitter Meta Tags
    const ogTitle = document.getElementById(
      "og-title",
    ) as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = fullTitle;

    const twitterTitle = document.getElementById(
      "twitter-title",
    ) as HTMLMetaElement | null;
    if (twitterTitle) twitterTitle.content = fullTitle;

    const ogDesc = document.getElementById("og-desc") as HTMLMetaElement | null;
    if (ogDesc) ogDesc.content = desc;

    const twitterDesc = document.getElementById(
      "twitter-desc",
    ) as HTMLMetaElement | null;
    if (twitterDesc) twitterDesc.content = desc;

    const ogUrl = document.getElementById("og-url") as HTMLMetaElement | null;
    if (ogUrl) ogUrl.content = canonicalUrl;

    const img = ogImage || DEFAULT_IMAGE;
    const ogImageEl = document.getElementById(
      "og-image",
    ) as HTMLMetaElement | null;
    if (ogImageEl) ogImageEl.content = img;

    const twitterImageEl = document.getElementById(
      "twitter-image",
    ) as HTMLMetaElement | null;
    if (twitterImageEl) twitterImageEl.content = img;

    // 5. Dynamic JSON-LD Schema
    const dynamicSchemaEl = document.getElementById(
      "dynamic-seo-schema",
    ) as HTMLScriptElement | null;
    if (dynamicSchemaEl) {
      if (schema) {
        dynamicSchemaEl.textContent = JSON.stringify(schema);
      } else {
        dynamicSchemaEl.textContent = "";
      }
    }
  }, [title, description, canonicalPath, ogImage, ogType, schema]);
}
