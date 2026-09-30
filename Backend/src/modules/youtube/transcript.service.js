import {youtubeTranscript} from "youtube-transcript";


// returns transcription only when manual or auto generated  transctipts exist
export async function fetchTranscript(videoId){

    try{
        const raw = await youtubeTranscript.fetchTranscript(videoId)
        // return transcript in format [ {},{}]

        if(!raw || raw.length === 0)return null

        const segments = raw.map((seg)=>({
            text:seg.text.trim(),
            start:seg.offset/1000, //convert ms in sec
            end:(seg.offset + seg.duration)/1000
        }))

        return segments;
    }catch(err){
        console.error('Error fetching the transcription of the given video. Maybe no captions exist , Let us try other options',err)
        return null
    }
}
//metadata is required cause u need to show in citation that from what source u got this rather than 
// showing just the video id
export async function fetchVideoMetadata(videoId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const response = await fetch(oembedUrl)

    if (!response.ok) throw new Error(`oEmbed returned ${response.status}`)

    const data = await response.json()
    return {
      title: data.title || `YouTube video ${videoId}`,
      author: data.author_name || null
    }
  } catch (err) {
    console.log(`Could not fetch metadata for ${videoId}: ${err.message}`)
    return { title: `YouTube video ${videoId}`, author: null }
  }
}
// raw transcript {
//     // start,end,text
// }