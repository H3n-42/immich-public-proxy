import { AssetType } from '../types'
import { ThemeScript } from './theme'
import { GalleryItem, LightboxConfig, MetadataConfig } from '../shared/types'
import { ASSET_VERSION } from '../version'

export type { GalleryItem, LightboxConfig, MetadataConfig }

export interface GalleryProps {
  items: GalleryItem[]
  title: string
  description: string
  publicBaseUrl: string
  path: string
  showDownload: boolean
  showUpload: boolean
  uploadPath: string
  showTitle: boolean
  openItem?: number
  ogImageItem?: GalleryItem
  lightboxConfig: LightboxConfig
  metadataConfig: MetadataConfig
  groupByDate: boolean
  metaBase?: string
}

export function Gallery (props: GalleryProps) {
  const initJson = JSON.stringify({
    items: props.items,
    openItem: props.openItem,
    lightboxConfig: props.lightboxConfig,
    metadataConfig: props.metadataConfig,
    groupByDate: props.groupByDate,
    metaBase: props.metaBase
  })
  const firstItem = props.items[0]
  const shareKey = props.path.split('/').pop() || ''
  // og:image prefers the album cover (passed via props); for videos, previewUrl
  // points to the .mp4, so use thumbnailUrl to keep og:image a still JPEG.
  const ogItem = props.ogImageItem || firstItem
  const ogImageAsset = ogItem
    ? (ogItem.type === AssetType.video ? ogItem.thumbnailUrl : ogItem.previewUrl)
    : ''
  const ogImageUrl = ogItem ? props.publicBaseUrl + ogImageAsset : ''

  return (
    <html lang="en">
      <head>
        <ThemeScript/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>{props.title}</title>
        <meta property="og:title" content={props.title}/>
        <meta name="twitter:title" content={props.title}/>
        {props.description && <>
          <meta name="description" content={props.description}/>
          <meta property="og:description" content={props.description}/>
          <meta property="twitter:description" content={props.description}/>
        </>}
        {firstItem && <>
          <meta property="og:image" content={ogImageUrl}/>
          <meta name="twitter:image" content={ogImageUrl}/>
          <meta name="twitter:card" content="summary_large_image"/>
        </>}
        <link rel="icon" href="/share/static/favicon.ico" type="image/x-icon"/>
        <link type="text/css" rel="stylesheet" href={`/share/static/${ASSET_VERSION}/style.css`}/>
        <link type="text/css" rel="stylesheet" href="/share/static/photoswipe/photoswipe.css"/>
        <link type="text/css" rel="stylesheet" href={`/share/static/${ASSET_VERSION}/photoswipe-overrides.css`}/>
      </head>
      <body>
        {(props.showTitle || props.showDownload) && (
          <header id="header">
            {props.showTitle && (
              <div class="header-text">
                <h1>{props.title || 'Gallery'}</h1>
                <p class="subtitle">
                  {props.items.length}{' '}
                  {props.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            )}
            {props.showDownload && (
              <a id="download-all" href={props.path + '/download'} title="Download all" aria-label="Download all">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                </svg>
              </a>
            )}
          </header>
        )}
        {props.description && (
          <p id="album-description">{props.description}</p>
        )}
{/* Container is intentionally empty - web.js's virtualisation manager
            populates it with only the tiles within the viewport buffer. */}
        <div id="gallery"></div>
        {props.showUpload && (
          <>
            <div id="upload-toast" class="upload-toast" role="status" aria-live="polite"></div>
            <button class="upload-fab" id="upload-fab" type="button" title="Upload photos" aria-label="Upload photos">
              <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.588T4 18v-3h2v3h12v-3h2v3q0 .825-.588 1.413T18 20H6Z"/>
              </svg>
              <span class="fab-spinner"></span>
            </button>
            <input type="file" id="upload-input" multiple style="display:none" accept="image/*,video/*"/>
            <script type="text/javascript" dangerouslySetInnerHTML={{
              __html: `(function () {
                  const fab = document.getElementById('upload-fab')
                  const input = document.getElementById('upload-input')
                  const toast = document.getElementById('upload-toast')
                  const uploadPath = '${props.uploadPath}'
                  const shareKey = '${shareKey}'
                  let toastTimer = null

                  function showToast (msg, type) {
                    if (toastTimer) clearTimeout(toastTimer)
                    toast.textContent = msg
                    toast.className = 'upload-toast visible ' + type
                    if (type === 'success') {
                      toastTimer = setTimeout(function () { toast.className = 'upload-toast' }, 4000)
                    }
                  }

                  toast.addEventListener('click', function () {
                    toast.className = 'upload-toast'
                  })

                  function retryThumbnail (img, baseUrl, attempt) {
                    var maxAttempts = 5
                    var delay = Math.min(2000 * Math.pow(2, attempt), 30000)
                    setTimeout(function () {
                      img.onload = function () {
                        img.parentElement.classList.remove('thumb-loading')
                      }
                      img.onerror = function () {
                        if (attempt + 1 < maxAttempts) {
                          retryThumbnail(img, baseUrl, attempt + 1)
                        } else {
                          img.parentElement.classList.remove('thumb-loading')
                          img.parentElement.classList.add('thumb-error')
                        }
                      }
                      img.src = baseUrl + '?t=' + Date.now()
                    }, delay)
                  }

                  fab.addEventListener('click', function () {
                    input.click()
                  })

                  input.addEventListener('change', async function () {
                    const files = input.files
                    if (!files || files.length === 0) return

                    fab.disabled = true
                    fab.classList.add('uploading')
                    showToast('Uploading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…', '')

                    const formData = new FormData()
                    for (const file of files) {
                      formData.append('assets', file)
                    }

                    try {
                      const res = await fetch(uploadPath, { method: 'POST', body: formData })
                      if (!res.ok) {
                        showToast('Upload failed. Tap to dismiss.', 'error')
                      } else {
                        const data = await res.json()
                        const succeeded = data.results.filter(function (r) { return r.status !== 'failed' }).length
                        const failed = data.results.filter(function (r) { return r.status === 'failed' }).length
                        let msg = succeeded + ' file' + (succeeded !== 1 ? 's' : '') + ' uploaded.'
                        if (failed > 0) msg += ' ' + failed + ' failed. Tap to dismiss.'
                        showToast(msg, failed > 0 ? 'error' : 'success')

                        const gallery = document.getElementById('gallery')
                        data.results.forEach(function (r) {
                          if (!r.id || r.status === 'failed' || r.status === 'duplicate') return
                          const thumbnail = '/share/photo/' + shareKey + '/' + r.id + '/thumbnail'
                          const preview = '/share/photo/' + shareKey + '/' + r.id + '/preview'
                          const download = '/share/photo/' + shareKey + '/' + r.id + '/original'
                          const filename = r.filename || r.id
                          const html = '<a href="' + preview + '"' +
                            ' data-download-url="' + download + '"' +
                            ' data-download="' + filename + '"' +
                            ' data-slide-name="' + r.id + '">' +
                            '<img alt="" loading="lazy" src="' + thumbnail + '"/>' +
                            '</a>'
                          gallery.insertAdjacentHTML('beforeend', html)
                        })
                      }
                    } catch (e) {
                      showToast('Upload failed: ' + e.message + '. Tap to dismiss.', 'error')
                    }

                    fab.disabled = false
                    fab.classList.remove('uploading')
                    input.value = ''
                  })
                })()`
            }} />
          </>
        )}
        {props.showDownload && (
          <div id="select-toolbar" hidden>
            <button id="select-cancel" class="toolbar-btn" type="button" aria-label="Exit selection mode">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
              </svg>
            </button>
            <span id="select-count">0 selected</span>
            <button id="select-all" class="toolbar-btn-text" type="button">Select all</button>
            <button id="select-download" class="toolbar-btn" type="button" aria-label="Download selected">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
              </svg>
            </button>
          </div>
        )}
        {/* Init params for web.js (read at module load). Using a JSON script
            block avoids the cross-script-type coordination problems that come
            with mixing classic and module scripts. */}
        <script
          type="application/json"
          id="ipp-init"
          dangerouslySetInnerHTML={{ __html: initJson }}
        />
        <script type="module" src={`/share/static/${ASSET_VERSION}/js/client/init.js`}></script>
      </body>
    </html>
  )
}
