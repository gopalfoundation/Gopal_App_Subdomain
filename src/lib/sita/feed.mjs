import {XMLParser} from 'fast-xml-parser';
export async function latestVideos(channelId,request=fetch,playlistId='') {
  if(playlistId?!/^[\w-]{10,100}$/.test(playlistId):!/^UC[\w-]{22}$/.test(channelId))throw Error('Enter a valid YouTube channel or playlist ID.');
  const r=await request('https://www.youtube.com/feeds/videos.xml?'+(playlistId?'playlist_id='+playlistId:'channel_id='+channelId),{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('YouTube could not supply this feed. Check the source and try again.');
  const feed=new XMLParser({ignoreAttributes:false}).parse(await r.text())?.feed,entries=Array.isArray(feed?.entry)?feed.entry:feed?.entry?[feed.entry]:[];
  return entries.map(entry=>({id:'yt-'+entry['yt:videoId'],url:'https://www.youtube.com/watch?v='+entry['yt:videoId'],title:String(entry.title||'SITA Video'),description:String(entry['media:group']?.['media:description']||'').slice(0,2000),thumbnail:'',publishedAt:entry.published||'',enabled:true,featured:false,source:'feed',displayOrder:0})).filter(v=>/^yt-[\w-]{11}$/.test(v.id));
}
