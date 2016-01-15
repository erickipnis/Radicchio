local ttl = redis.call('HGET', KEYS[1], KEYS[2])
return redis.call('PSETEX', KEYS[2], ttl, '')
