import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import crypto from 'crypto'

// it is basically a large chunk where RecursiveCharacterTextSplitter is a class and u r requiring its method by creating object
const parentSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 100,
    separators: ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', '. ', '']
})

const childSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 30,
    separators: ['\n\n', '\n', '. ', '']
})

// all page is chunked once wiht provided details
export async function chunkPage({ content, pageUrl, pageTitle, sourceId, workspaceId }) {

    if (!content || content.length < 50) return []

    const sections = splitSections(content)
    const allChunks = []

    for (const section of sections) {

        if (!section.text || section.text.length < 30) continue

        // this returns an array of strings
        const parentChunks = await parentSplitter.splitText(section.text)

        // now for this parent chunk u further divide in children chunk so that embeeding becomes perfect and no ambiguity
        for (let pIndex = 0; pIndex < parentChunks.length; pIndex++) {

            const parentChunkText = parentChunks[pIndex]
            if (!parentText.trim()) continue

            // generate stable parent id and hash it cause if docs dont change no need to re cawl. this avoids duplication of data
            const parentId = generateId(`${sourceId}-${pageUrl}-parent-${pIndex}`)

            const childChunks = childSplitter.splitText(parentChunkText)

            for (let cIndex = 0; cIndex < childChunks.length; cIndex++) {
                const childText = childChunks[cIndex]
                if (!childText.trim()) continue

                // deterministic chunk ID — idempotent re-indexing F1 engine
                // same content always gets same ID — safe to re-index without duplicates
                const chunkId = generateId(
                    `${sourceId}-${pageUrl}-${pIndex}-${cIndex}-${childText}`
                )

                allChunks.push({
                    id: chunkId,
                    parentChunkText,
                    childText,
                    metadata: {
                        sourceId,
                        workspaceId,
                        pageUrl,
                        pageTitle,
                        sectionHeading: section.heading || pageTitle,
                        parentId,
                        parentIndex: pIndex,
                        chunkIndex: cIndex
                    }

                })
            }
        }
    }

    return allChunks
}

// u split the whole content based on sections or heading where context remains isolated
function splitSections(text) {
    // find every line that starts with # , ## , ###
    const headingRegex = /^(#{1,3})\s+(.+)$/gm
    const sections = []
    let lastIndex = 0
    let lastHeading = ''
    let match

    // suppose it is # Introduction 
    //so ur match becomes match = [
    //    "# Introduction",
    //    "#",
    //    "Introduction"
    // ]
    while ((match = headingRegex.exec(text)) != null) {
        console.log(match)

        if (lastIndex < match.index) {
            // suppose intro is at 0 and second is at 45. so it stores intro heading and all char bwn  and 45
            sections.push({
                heading: lastHeading,
                text: text.slice(lastIndex, match.index).trim()
            })
        }
        // lastIndex tells where the heading meet
        lastHeading = match[2]
        lastIndex = match.index
    }

    // push final sections
    if (lastIndex < text.length) {
        sections.push({
            heading: lastHeading,
            text: text.slice(lastIndex).trim()
        })
    }

    if (sections.length === 0) {
        sections.push({
            heading: '',
            text: ''
        })
    }
    return sections
}
function generateId(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}