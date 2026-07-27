import { chunkPage } from './chunker.service'
import { cleanHtml } from './readability.service'
import { CheerioCrawler, Configuration } from 'crawlee'

Configuration.getGlobalConfig().set('logLevel', 'ERROR') // Only log errors

export async function crawlSource({ url, sourceId, workspaceId, onPageCrawled, onProgress }) {

    const allChunks = []
    const crawledUrls = new Set() // Track visited URLs

    const rootUrl = new URL(url)
    const path = rootUrl.pathname
    let pageCount = 0

    // CheerioCrawler setup
    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 100,   // Max 100 pages to crawl
        maxConcurrency: 5,          // Parallel limit
        maxRequestRetries: 2,       // Retry failed pages up to 2 times
        ignoreSslErrors: true,

        async requestHandler({ request, $, enqueueLinks }) {
            const currentUrl = request.url
            console.log(`Crawling ${currentUrl}`)

            // Skip if already crawled
            if (crawledUrls.has(currentUrl)) return
            crawledUrls.add(currentUrl)

            const html = $.html()

            const { title, content, failed } = await cleanHtml(html, currentUrl)

            if (!failed && content && content.length > 100) {
                pageCount++
            } else {
                // Don't process pages with bad or empty content
                return
            }

            // Report progress (page-level)
            // this keeps track of showing user the work flow
            // in js a function is always a truthy means true
            if (onProgress) {
                await onProgress({
                    pageUrl: currentUrl,
                    pageCount
                })
            }

            // Chunk the page content
            const chunks = await chunkPage({
                content,
                pageUrl: currentUrl,
                pageTitle: title,
                sourceId,
                workspaceId
            })

            allChunks.push(...chunks)

            // Callback for each crawled page's chunks
            if (onPageCrawled) {
                await onPageCrawled({
                    pageUrl: currentUrl,
                    pageTitle: title,
                    chunks
                })
            }

            // Find and enqueue additional (same-domain) links
            await enqueueLinks({
                strategy: 'same-domain',
                /* Keeps the pathname of sameDomain */
                transformRequestFunction(req) {

                    const linkUrl = new URL(req.url)

                    // only crawl pages under the same path prefix
                    if (!linkUrl.pathname.startsWith(basePath)) {
                        return false // skip this link
                    }
                    const skipPatterns = [
                        '/api/', '/cdn-cgi/', '.json', '.xml',
                        '.pdf', '.zip', '#', 'mailto:', 'javascript:'
                    ]
                    if (skipPatterns.some(p => req.url.includes(p))) {
                        return false
                    }

                    return req
                }
            })
        },
        // handle failed requests gracefully
        // // This function is called if the page processing failed more than maxRequestRetries + 1 times.
        failedRequestHandler({ request, error }) {
            console.error(`Failed to crawl ${request.url}:`, error.message)
        }
    })

    // Run the crawler starting from the initial page
    await crawler.run([url])

    return {
        allChunks,
        pageCount: crawledUrls.size,
        chunkCount: allChunks.length
    }
}