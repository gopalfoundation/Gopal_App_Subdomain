// Isolated, nonpersistent storage for local adapter verification only.
export function memoryBucket() {
  const map = new Map(); let sequence = 0;
  return {
    async get(key) {const item=map.get(key);return item?{etag:item.etag,body:item.value,httpMetadata:item.metadata,json:async()=>JSON.parse(item.value)}:null;},
    async put(key,value,options={}) {
      const previous=map.get(key), condition=options.onlyIf;
      if(condition instanceof Headers && condition.get('If-None-Match')==='*' && previous)return null;
      if(condition?.etagMatches && condition.etagMatches!==previous?.etag)return null;
      const etag=String(++sequence); map.set(key,{etag,value,metadata:options.httpMetadata}); return {etag};
    }
  };
}
