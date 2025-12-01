import { Hono } from 'hono'
import { html } from 'hono/html'

const DEFAULT_TARGET_HOST = "github.com"
const DEFAULT_USER = "chardoncs"

interface PackageMetadata {
  host: string
  user: string
  vcs?: string
  protocol?: string
  target?: string
  redirectTo?: string
}

const PACKAGE_EXCEPTIONS: Record<string, PackageMetadata | undefined> = {}

const getPackagePath = (pkg: string) => pkg ? `/${pkg}` : ""

function constructTarget(metadata: PackageMetadata, packageName: string) {
  switch (metadata.protocol) {
  case "ssh":
    const user = (metadata.vcs ?? "git") === "git" ? "git" : metadata.user
    return `${user}@${metadata.host}:${metadata.user}${getPackagePath(packageName)}`

  default:
    return `https://${metadata.host}/${metadata.user}${getPackagePath(packageName)}`
  }
}

const app = new Hono()

app.on("GET", ["/", "/:package/*"], (c) => {
  const host = c.req.header("Host")

  const packageName = c.req.param("package") ?? ""

  const metadata = PACKAGE_EXCEPTIONS[packageName] ?? {
    host: DEFAULT_TARGET_HOST,
    user: DEFAULT_USER,
  }

  const target = metadata.target ?? constructTarget(metadata, packageName)
  const httpsTarget = !metadata.protocol || metadata.protocol === "https" ? target : constructTarget({ ...metadata, protocol: "https" }, packageName)
  const redirectTo = metadata.redirectTo ?? httpsTarget

  const isGoGet = c.req.queries("go-get")?.at(0) === "1"

  const packagePath = getPackagePath(packageName)

  const goMetaTags = () =>
    html`\
<meta name="go-import" content="${host}${packagePath} ${metadata.vcs ?? "git"} ${target}">
<meta name="go-source" content="${host}${packagePath} ${httpsTarget} ${httpsTarget}/tree/HEAD{/dir} ${httpsTarget}/blob/HEAD{/dir}/{file}#L{line}">\
`

  return c.html(
    html`\
<!DOCTYPE html>
<html>
<head>
${isGoGet ? goMetaTags() : ""}
<meta http-equiv="Refresh" content="0;url=${redirectTo}">
</head>
<body>
Redirecting to <a href="${redirectTo}">${redirectTo}</a>...
</body>
</html>
`
  )
})

export default app
