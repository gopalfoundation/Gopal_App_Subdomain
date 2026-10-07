export function privateFileBucket(bucket) {
  return {
    async get(key) {
      try {
        const [metadata] = await bucket.file(key).getMetadata();
        const [bytes] = await bucket.file(key, {generation:metadata.generation}).download();
        return {etag:metadata.generation, body:bytes, httpMetadata:{contentType:metadata.contentType}, json:async () => JSON.parse(bytes.toString('utf8'))};
      } catch (error) { if (Number(error.code) === 404) return null; throw error; }
    },
    async put(key, value, options = {}) {
      const match = options.onlyIf?.etagMatches;
      const createOnly = options.onlyIf instanceof Headers && options.onlyIf.get('If-None-Match') === '*';
      const preconditionOpts = match ? {ifGenerationMatch:Number(match)} : createOnly ? {ifGenerationMatch:0} : undefined;
      try {
        await bucket.file(key).save(typeof value === 'string' ? value : Buffer.from(value), {
          resumable:false, preconditionOpts,
          metadata:{contentType:options.httpMetadata?.contentType || 'application/octet-stream', cacheControl:'no-store, private'}
        });
        return {stored:true};
      } catch (error) { if (Number(error.code) === 412) return null; throw error; }
    }
  };
}
