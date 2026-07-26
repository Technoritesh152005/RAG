// first u need to make a readable docs page whoch is formatted in dom structure
// Take raw HTML of a webpage and extract only the useful article/content while removing headers, navbars, ads, footers, scripts, etc.

import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export function cleanHtml(rawHtml, url) {

    try {

        // creates a dom structure
        const dom = new JSDOM(html, { url })

        // run readability 
        const reader = new Readability(dom.window.document, {
            // dont take css file class selectors
            keepClasses: false,
            // dont take semantic tags which r taken for seo improvation
            disableJSONLD: true
        })

        // this removes useful content
        const article = reader.parse()
        if (!article) {
            // try fallback method
            const fallbackDom = new JSDOM(html)
            return {
                title: fallbackDom.window.document.title || '',
                content: fallbackDom.window.document.body?.textContent?.trim() || '',
                failed: true
            }
        }
        return {
            title: article.title  || '',
            content: cleanText(article.textContent) || '',
            failed: false
        }

    } catch (error) {
        console.error(`Readability failed for ${url}:`, err.message)
        return { title: '', content: '', failed: true }
    }
}

function cleanText(text) {
    return text
        .replace(/\r\n/g, '\n')           // normalize line endings
        .replace(/\t/g, ' ')              // tabs to spaces
        .replace(/[ ]{2,}/g, ' ')         // multiple spaces to one
        .replace(/\n{3,}/g, '\n\n')       // max 2 consecutive newlines
        .trim()
}