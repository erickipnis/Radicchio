local ttl = redis.call('PTTL', KEYS[2])
redis.call('HSET', KEYS[1], KEYS[2], ttl)
return redis.call('DEL', KEYS[2])
