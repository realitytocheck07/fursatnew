// Sanity CDN image URLs from an image asset _ref, with hotspot and crop.
import { getSanityConfig } from './sanity.ts';

export const IMAGE_WIDTHS = [480, 720, 1080] as const;

export type SanityImage = {
  alt?: string;
  asset?: {
    _ref?: string;
    _id?: string;
    metadata?: { lqip?: string; palette?: { dominant?: { background?: string } } };
  };
  hotspot?: { x: number; y: number; width?: number; height?: number };
  crop?: { top?: number; bottom?: number; left?: number; right?: number };
};
export type ImageOpts = { projectId?: string; dataset?: string; aspect?: number };
export type ImageSet = {
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  lqip: string;
  color: string;
};

/** "image-<hash>-<w>x<h>-<ext>" -> parts, or null when it is not an image ref. */
export function parseImageRef(ref: unknown): { id: string; width: number; height: number; ext: string } | null {
  const m = /^image-([A-Za-z0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/.exec(String(ref || ''));
  return m ? { id: m[1], width: +m[2], height: +m[3], ext: m[4] } : null;
}

const clamp01 = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0));

/** One image URL at a given width. Returns '' when the ref or project is missing. */
export function imageUrl(image: SanityImage | null | undefined, width: number, opts: ImageOpts = {}): string {
  const ref = parseImageRef(image?.asset?._ref || image?.asset?._id);
  const cfg = opts.projectId ? { projectId: opts.projectId, dataset: opts.dataset || 'production' } : getSanityConfig();
  if (!image || !ref || !cfg) return '';

  const q: string[] = [];
  const c = image.crop;
  if (c) {
    const l = clamp01(c.left), r = clamp01(c.right), t = clamp01(c.top), b = clamp01(c.bottom);
    const w = Math.round(ref.width * (1 - l - r)), h = Math.round(ref.height * (1 - t - b));
    if (w > 0 && h > 0 && (l || r || t || b)) q.push(`rect=${Math.round(ref.width * l)},${Math.round(ref.height * t)},${w},${h}`);
  }
  q.push('auto=format', `w=${Math.round(width)}`);
  if (opts.aspect && opts.aspect > 0) q.push(`h=${Math.round(width / opts.aspect)}`);
  q.push('fit=crop');
  if (image.hotspot) q.push('crop=focalpoint', `fp-x=${clamp01(image.hotspot.x).toFixed(3)}`, `fp-y=${clamp01(image.hotspot.y).toFixed(3)}`);

  return `https://cdn.sanity.io/images/${cfg.projectId}/${cfg.dataset}/${ref.id}-${ref.width}x${ref.height}.${ref.ext}?${q.join('&')}`;
}

/** srcset string for 480 / 720 / 1080. */
export function imageSrcset(image: SanityImage | null | undefined, opts: ImageOpts = {}): string {
  return IMAGE_WIDTHS.map((w) => ({ w, u: imageUrl(image, w, opts) }))
    .filter((x) => x.u)
    .map((x) => `${x.u} ${x.w}w`)
    .join(', ');
}

/** Low-quality placeholder (data URI) and dominant colour, when asset->metadata was fetched. */
export function imagePlaceholder(image: SanityImage | null | undefined): { lqip: string; color: string } {
  const md = image?.asset?.metadata;
  return { lqip: md?.lqip || '', color: md?.palette?.dominant?.background || '' };
}

/** Everything a card needs: src, srcset, size, alt, placeholder. Null when there is no usable image. */
export function imageSet(image: SanityImage | null | undefined, opts: ImageOpts = {}): ImageSet | null {
  const ref = parseImageRef(image?.asset?._ref || image?.asset?._id);
  const src = imageUrl(image, 720, opts);
  if (!ref || !src) return null;
  const ratio = opts.aspect && opts.aspect > 0 ? opts.aspect : ref.width / ref.height;
  return {
    src,
    srcset: imageSrcset(image, opts),
    width: 720,
    height: Math.round(720 / ratio),
    alt: String(image?.alt || ''),
    ...imagePlaceholder(image),
  };
}
