import fs from "node:fs"
import path from "node:path"

const repo = "hurry060215-tech/zhl-blog"
const branch = "main"
const contentRoot = "content"
const publicRoot = "public"

const assetExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
])

const posix = path.posix

function toPosix(filePath) {
  return filePath.split(path.sep).join("/")
}

function slugSegment(segment) {
  return segment.toLowerCase().replace(/\s+/g, "-")
}

function slugPath(filePath) {
  return filePath.split("/").map(slugSegment).join("/")
}

function walkFiles(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath))
    } else if (entry.isFile()) {
      out.push(fullPath)
    }
  }
  return out
}

function assetUrl(contentRelativePath) {
  const encodedPath = contentRelativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `https://media.githubusercontent.com/media/${repo}/${branch}/${encodedPath}`
}

function splitUrl(value) {
  const hashIndex = value.indexOf("#")
  const queryIndex = value.indexOf("?")
  const indexes = [hashIndex, queryIndex].filter((index) => index !== -1)
  const splitAt = indexes.length > 0 ? Math.min(...indexes) : value.length
  return {
    pathname: value.slice(0, splitAt),
    suffix: value.slice(splitAt),
  }
}

function decodePathname(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isExternalOrSpecial(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value)
}

function publicRelativeTarget(htmlRelativePath, urlPathname) {
  const decoded = decodePathname(urlPathname)
  if (decoded.startsWith("/")) return posix.normalize(decoded.slice(1))

  const htmlDir = posix.dirname(htmlRelativePath)
  return posix.normalize(posix.join(htmlDir, decoded))
}

const contentAssetBySlug = new Map()
for (const file of walkFiles(contentRoot)) {
  const extension = path.extname(file).toLowerCase()
  if (!assetExtensions.has(extension)) continue

  const contentRelativePath = toPosix(path.relative(".", file))
  const siteRelativePath = toPosix(path.relative(contentRoot, file))
  contentAssetBySlug.set(slugPath(siteRelativePath), contentRelativePath)
}

let htmlFilesChanged = 0
let linksRewritten = 0
const unresolved = new Set()

for (const file of walkFiles(publicRoot)) {
  if (path.extname(file).toLowerCase() !== ".html") continue

  const htmlRelativePath = toPosix(path.relative(publicRoot, file))
  const html = fs.readFileSync(file, "utf8")

  const rewritten = html.replace(
    /\b(href|src|poster)=("|')([^"']+)\2/g,
    (match, attr, quote, value) => {
      if (isExternalOrSpecial(value)) return match

      const { pathname, suffix } = splitUrl(value)
      const extension = posix.extname(pathname).toLowerCase()
      if (!assetExtensions.has(extension)) return match

      const target = publicRelativeTarget(htmlRelativePath, pathname)
      const contentRelativePath =
        contentAssetBySlug.get(slugPath(target)) ??
        contentAssetBySlug.get(slugPath(`OBStudy/${target}`))
      if (!contentRelativePath && target.startsWith("static/")) {
        return match
      } else if (!contentRelativePath) {
        unresolved.add(`${htmlRelativePath} -> ${value}`)
        return match
      }

      linksRewritten += 1
      return `${attr}=${quote}${assetUrl(contentRelativePath)}${suffix}${quote}`
    },
  )

  if (rewritten !== html) {
    fs.writeFileSync(file, rewritten)
    htmlFilesChanged += 1
  }
}

let assetsRemoved = 0
for (const file of walkFiles(publicRoot)) {
  const extension = path.extname(file).toLowerCase()
  if (!assetExtensions.has(extension)) continue
  const publicRelativePath = toPosix(path.relative(publicRoot, file))
  if (!publicRelativePath.startsWith("obstudy/")) continue

  fs.rmSync(file)
  assetsRemoved += 1
}

if (unresolved.size > 0) {
  console.error("Could not map some local asset links to GitHub LFS URLs:")
  for (const item of [...unresolved].slice(0, 50)) {
    console.error(`- ${item}`)
  }
  if (unresolved.size > 50) {
    console.error(`...and ${unresolved.size - 50} more`)
  }
  process.exit(1)
}

console.log(
  `Rewrote ${linksRewritten} LFS asset links in ${htmlFilesChanged} HTML files and removed ${assetsRemoved} local asset files from public.`,
)
